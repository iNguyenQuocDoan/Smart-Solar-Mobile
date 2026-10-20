import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, Field, IconButton, PageHeader, Panel, QueryState, Screen, SectionTitle, StateView } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { keys } from '@/hooks/queries'
import { ApiError } from '@/lib/api/client'
import { assessmentService } from '@/lib/api/services'
import type { AssessmentDraft, AssessmentObstacle, AssessmentSurface } from '@/lib/api/types'
import {
  clearAssessmentDraft,
  hasCustomerProfile,
  readAssessmentDraft,
  rememberCustomerProfile,
  saveAssessmentDraft,
} from '@/lib/assessmentStorage'
import { useAppTheme } from '@/theme/theme'

type ProfileForm = { customerType: 1 | 2; companyName: string; taxCode: string; note: string }
type SiteForm = {
  name: string
  ward: string
  streetLine: string
  latitude: string
  longitude: string
  installationSurfaceType: number
  surfaceMaterial: string
}
type ObstacleForm = { key: string; name: string; xM: string; yM: string; widthM: string; lengthM: string; heightM: string }
type SurfaceForm = { widthM: string; lengthM: string; tiltDegree: string; azimuthDegree: number; obstacles: ObstacleForm[] }
type Errors = Record<string, string>

const emptyProfile: ProfileForm = { customerType: 2, companyName: '', taxCode: '', note: '' }
const emptySite: SiteForm = { name: '', ward: '', streetLine: '', latitude: '', longitude: '', installationSurfaceType: 1, surfaceMaterial: '' }
const emptySurface: SurfaceForm = { widthM: '', lengthM: '', tiltDegree: '', azimuthDegree: 180, obstacles: [] }
const steps = ['Hồ sơ', 'Địa điểm', 'Mặt lắp', 'Xem lại']
const surfaceTypes = [
  { value: 1, label: 'Mái nhà' },
  { value: 2, label: 'Mặt đất' },
  { value: 3, label: 'Mái che xe' },
  { value: 4, label: 'Mặt dựng' },
  { value: 5, label: 'Khác' },
]
const directions = [
  { value: 0, label: 'Bắc' }, { value: 45, label: 'Đông Bắc' }, { value: 90, label: 'Đông' }, { value: 135, label: 'Đông Nam' },
  { value: 180, label: 'Nam' }, { value: 225, label: 'Tây Nam' }, { value: 270, label: 'Tây' }, { value: 315, label: 'Tây Bắc' },
]

function num(value: string) {
  const parsed = Number(value.trim().replace(',', '.'))
  return value.trim() && Number.isFinite(parsed) ? parsed : null
}

function fieldError(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể lưu dữ liệu. Vui lòng thử lại.'
}

function surfaceFromView(view: AssessmentSurface): SurfaceForm {
  return {
    widthM: view.surfaceWidthM == null ? '' : String(view.surfaceWidthM),
    lengthM: view.surfaceLengthM == null ? '' : String(view.surfaceLengthM),
    tiltDegree: view.surfaceTiltDegree == null ? '' : String(view.surfaceTiltDegree),
    azimuthDegree: view.surfaceAzimuthDegree ?? 180,
    obstacles: view.obstacles.map((item, index) => ({
      key: `${index}-${item.name}`,
      name: item.name,
      xM: String(item.xM),
      yM: String(item.yM),
      widthM: String(item.widthM),
      lengthM: String(item.lengthM),
      heightM: item.heightM == null ? '' : String(item.heightM),
    })),
  }
}

function obstacleArea(obstacles: AssessmentObstacle[], width: number, length: number) {
  const rects = obstacles.map((item) => ({
    x1: Math.max(0, item.xM), y1: Math.max(0, item.yM),
    x2: Math.min(width, item.xM + item.widthM), y2: Math.min(length, item.yM + item.lengthM),
  })).filter((item) => item.x2 > item.x1 && item.y2 > item.y1)
  const xs = [...new Set(rects.flatMap((item) => [item.x1, item.x2]))].sort((a, b) => a - b)
  const ys = [...new Set(rects.flatMap((item) => [item.y1, item.y2]))].sort((a, b) => a - b)
  let area = 0
  for (let x = 0; x < xs.length - 1; x += 1) {
    for (let y = 0; y < ys.length - 1; y += 1) {
      const centerX = (xs[x]! + xs[x + 1]!) / 2
      const centerY = (ys[y]! + ys[y + 1]!) / 2
      if (rects.some((item) => centerX > item.x1 && centerX < item.x2 && centerY > item.y1 && centerY < item.y2)) {
        area += (xs[x + 1]! - xs[x]!) * (ys[y + 1]! - ys[y]!)
      }
    }
  }
  return area
}

function ChoiceGroup<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  const theme = useAppTheme()
  return (
    <View style={styles.choiceGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => {
          const selected = value === option.value
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.brand : theme.border, backgroundColor: selected ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface }]}
            >
              <Text style={[styles.choiceText, { color: selected ? theme.brandText : theme.text }]}>{option.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

function StepBar({ current, firstStep }: { current: number; firstStep: number }) {
  const theme = useAppTheme()
  return (
    <View>
      <View style={styles.stepRow}>
        {steps.map((label, index) => (
          <View key={label} style={styles.stepItem}>
            {index > 0 ? <View style={[styles.stepLine, { backgroundColor: index <= current ? theme.brand : theme.border }]} /> : null}
            <View style={[styles.stepDot, { backgroundColor: index <= current || index < firstStep ? theme.brand : theme.surface, borderColor: index <= current || index < firstStep ? theme.brand : theme.border }]}>
              <Text style={[styles.stepNumber, { color: index <= current || index < firstStep ? theme.onBrand : theme.textMuted }]}>{index + 1}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={[styles.stepLabel, { color: theme.textMuted }]}>Bước {current + 1}/4 · {steps[current]}</Text>
    </View>
  )
}

export function AssessmentScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const account = session?.userId || session?.email || 'anonymous'
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [profileDone, setProfileDone] = useState(false)
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<ProfileForm>(emptyProfile)
  const [site, setSite] = useState<SiteForm>(emptySite)
  const [surface, setSurface] = useState<SurfaceForm>(emptySurface)
  const [draft, setDraft] = useState<AssessmentDraft | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const firstStep = profileDone ? 1 : 0

  useEffect(() => {
    let active = true
    async function restore() {
      try {
        const [profileExists, stored] = await Promise.all([hasCustomerProfile(account), readAssessmentDraft(account)])
        if (!active) return
        setProfileDone(profileExists)
        if (!stored) {
          setStep(profileExists ? 1 : 0)
          return
        }
        setSite({ ...emptySite, ...stored.site, latitude: String(stored.site.latitude), longitude: String(stored.site.longitude) })
        let current = stored
        if (!current.preSurveyId) {
          const created = await assessmentService.createDraft(current.propertySiteId)
          current = { ...current, preSurveyId: created.preSurveyId }
          await saveAssessmentDraft(account, current)
        }
        let preSurveyId = current.preSurveyId
        if (!preSurveyId) throw new Error('Bản nháp chưa có mã đánh giá.')
        let view = await assessmentService.getSurface(preSurveyId)
        if (view.status !== 'DRAFT') {
          const created = await assessmentService.createDraft(current.propertySiteId)
          preSurveyId = created.preSurveyId
          current = { ...current, preSurveyId }
          await saveAssessmentDraft(account, current)
          view = await assessmentService.getSurface(preSurveyId)
        }
        current = { ...current, revision: view.revision }
        await saveAssessmentDraft(account, current)
        if (!active) return
        setDraft(current)
        setSurface(surfaceFromView(view))
        setStep(2)
      } catch (reason) {
        if (active) setLoadError(reason instanceof Error ? reason : new Error('Không mở được bản nháp.'))
      } finally {
        if (active) setLoading(false)
      }
    }
    void restore()
    return () => { active = false }
  }, [account, reloadKey])

  const parsedSurface = useMemo(() => {
    const width = num(surface.widthM)
    const length = num(surface.lengthM)
    const tilt = num(surface.tiltDegree)
    const obstacles = surface.obstacles.flatMap<AssessmentObstacle>((item) => {
      const xM = num(item.xM); const yM = num(item.yM); const widthM = num(item.widthM); const lengthM = num(item.lengthM); const heightM = num(item.heightM)
      if (xM == null || yM == null || widthM == null || lengthM == null) return []
      return [{ name: item.name.trim(), xM, yM, widthM, lengthM, heightM }]
    })
    if (width == null || length == null || tilt == null) return null
    const totalAreaM2 = Math.round(width * length * 100) / 100
    const usableAreaM2 = Math.round(Math.max(0, totalAreaM2 - obstacleArea(obstacles, width, length)) * 100) / 100
    return { width, length, tilt, obstacles, totalAreaM2, usableAreaM2 }
  }, [surface])

  function updateProfile(patch: Partial<ProfileForm>) { setProfile((value) => ({ ...value, ...patch })); setErrors({}); setFormError('') }
  function updateSite(patch: Partial<SiteForm>) { setSite((value) => ({ ...value, ...patch })); setErrors({}); setFormError('') }
  function updateSurface(patch: Partial<SurfaceForm>) { setSurface((value) => ({ ...value, ...patch })); setErrors({}); setFormError('') }

  async function saveProfile() {
    setPending(true); setFormError('')
    try {
      try {
        await assessmentService.createProfile({
          customerType: profile.customerType,
          companyName: profile.customerType === 2 ? profile.companyName.trim() || null : null,
          taxCode: profile.taxCode.trim() || null,
          note: profile.note.trim() || null,
        })
      } catch (reason) {
        if (!(reason instanceof ApiError && reason.code === 'CUSTOMER_ALREADY_EXISTS')) throw reason
      }
      await rememberCustomerProfile(account)
      setProfileDone(true)
      setStep(1)
    } catch (reason) { setFormError(fieldError(reason)) } finally { setPending(false) }
  }

  function validateSite() {
    const next: Errors = {}
    const latitude = num(site.latitude)
    const longitude = num(site.longitude)
    if (!site.name.trim()) next.name = 'Nhập tên để phân biệt công trình.'
    if (!site.ward.trim()) next.ward = 'Nhập phường hoặc xã.'
    if (latitude == null || latitude < -90 || latitude > 90) next.latitude = 'Vĩ độ phải từ -90 đến 90.'
    if (longitude == null || longitude < -180 || longitude > 180) next.longitude = 'Kinh độ phải từ -180 đến 180.'
    if (latitude === 0 && longitude === 0) next.latitude = 'Toạ độ (0, 0) không phải vị trí công trình.'
    setErrors(next)
    return Object.keys(next).length === 0 && latitude != null && longitude != null ? { latitude, longitude } : null
  }

  async function saveSite() {
    const location = validateSite()
    if (!location) return
    setPending(true); setFormError('')
    try {
      const siteBody = {
        name: site.name.trim(), province: 'Thành phố Hồ Chí Minh', district: null, ward: site.ward.trim(),
        streetLine: site.streetLine.trim() || null, latitude: location.latitude, longitude: location.longitude,
        installationSurfaceType: site.installationSurfaceType, surfaceMaterial: site.surfaceMaterial.trim() || null, note: null,
      }
      const createdSite = await assessmentService.createSite(siteBody)
      let nextDraft: AssessmentDraft = {
        propertySiteId: createdSite.propertySiteId,
        site: { ...site, name: siteBody.name, ward: siteBody.ward, latitude: location.latitude, longitude: location.longitude },
      }
      await saveAssessmentDraft(account, nextDraft)
      const createdDraft = await assessmentService.createDraft(createdSite.propertySiteId)
      nextDraft = { ...nextDraft, preSurveyId: createdDraft.preSurveyId }
      await saveAssessmentDraft(account, nextDraft)
      const view = await assessmentService.getSurface(createdDraft.preSurveyId)
      nextDraft = { ...nextDraft, revision: view.revision }
      await saveAssessmentDraft(account, nextDraft)
      setDraft(nextDraft); setSurface(surfaceFromView(view)); setStep(2)
    } catch (reason) { setFormError(fieldError(reason)) } finally { setPending(false) }
  }

  function validateSurface() {
    const next: Errors = {}
    const parsed = parsedSurface
    if (!parsed || parsed.width <= 0 || parsed.width > 200) next.widthM = 'Chiều rộng phải lớn hơn 0 và không quá 200 m.'
    if (!parsed || parsed.length <= 0 || parsed.length > 200) next.lengthM = 'Chiều dài phải lớn hơn 0 và không quá 200 m.'
    if (!parsed || parsed.tilt < 0 || parsed.tilt > 90) next.tiltDegree = 'Độ dốc phải từ 0 đến 90°.'
    surface.obstacles.forEach((item, index) => {
      const xM = num(item.xM)
      const yM = num(item.yM)
      const widthM = num(item.widthM)
      const lengthM = num(item.lengthM)
      const heightM = item.heightM.trim() ? num(item.heightM) : null
      if (!item.name.trim()) next[`obstacle-${index}-name`] = 'Nhập tên vật cản.'
      else if (item.name.trim().length > 100) next[`obstacle-${index}-name`] = 'Tên vật cản không quá 100 ký tự.'
      if (xM == null || yM == null || widthM == null || lengthM == null || xM < 0 || yM < 0 || widthM <= 0 || lengthM <= 0) {
        next[`obstacle-${index}`] = 'Vị trí không âm; kích thước phải lớn hơn 0.'
      } else if (parsed && (xM + widthM > parsed.width || yM + lengthM > parsed.length)) {
        next[`obstacle-${index}`] = 'Vật cản phải nằm trọn trong mặt lắp.'
      } else if (item.heightM.trim() && (heightM == null || heightM < 0 || heightM > 100)) {
        next[`obstacle-${index}`] = 'Chiều cao vật cản phải từ 0 đến 100 m.'
      }
    })
    if (parsed && parsed.usableAreaM2 <= 0) next.obstacles = 'Vật cản đang phủ kín toàn bộ mặt lắp.'
    setErrors(next)
    return Object.keys(next).length === 0 ? parsed : null
  }

  async function saveSurface() {
    const parsed = validateSurface()
    if (!parsed || !draft?.preSurveyId || draft.revision == null) return
    setPending(true); setFormError('')
    try {
      const written = await assessmentService.saveSurface(draft.preSurveyId, {
        expectedRevision: draft.revision,
        surfaceLengthM: parsed.length,
        surfaceWidthM: parsed.width,
        surfaceTiltDegree: parsed.tilt,
        surfaceAzimuthDegree: surface.azimuthDegree,
        obstacles: parsed.obstacles,
      })
      const writtenDraft = { ...draft, revision: written.revision }
      await saveAssessmentDraft(account, writtenDraft)
      setDraft(writtenDraft)
      await assessmentService.updateDeclared(draft.preSurveyId, {
        totalAreaM2: parsed.totalAreaM2,
        usableAreaM2: parsed.usableAreaM2,
        tiltDegree: parsed.tilt,
        azimuthDegree: surface.azimuthDegree,
        hasObstruction: parsed.obstacles.length > 0,
      })
      const latest = await assessmentService.getSurface(draft.preSurveyId)
      const nextDraft = { ...draft, revision: latest.revision }
      await saveAssessmentDraft(account, nextDraft)
      setDraft(nextDraft); setSurface(surfaceFromView(latest)); setStep(3)
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'PRE_SURVEY_CONCURRENTLY_MODIFIED') {
        try {
          const latest = await assessmentService.getSurface(draft.preSurveyId)
          const nextDraft = { ...draft, revision: latest.revision }
          await saveAssessmentDraft(account, nextDraft)
          setDraft(nextDraft)
          setSurface(surfaceFromView(latest))
          setFormError('Đã tải dữ liệu mới nhất từ máy chủ. Kiểm tra lại trước khi lưu.')
        } catch (reloadReason) {
          setFormError(fieldError(reloadReason))
        }
      } else if (reason instanceof ApiError && (reason.code === 'PRE_SURVEY_NOT_EDITABLE' || reason.code === 'PRE_SURVEY_ALREADY_SUBMITTED')) {
        try {
          const created = await assessmentService.createDraft(draft.propertySiteId)
          const view = await assessmentService.getSurface(created.preSurveyId)
          const nextDraft = { ...draft, preSurveyId: created.preSurveyId, revision: view.revision }
          await saveAssessmentDraft(account, nextDraft)
          setDraft(nextDraft)
          setFormError('Bản trước đã được gửi. Đã tạo bản mới cho địa điểm này, hãy lưu lại mặt lắp.')
        } catch (restartReason) {
          setFormError(fieldError(restartReason))
        }
      } else {
        setFormError(fieldError(reason))
      }
    } finally { setPending(false) }
  }

  async function submit() {
    if (!draft?.preSurveyId) return
    setPending(true); setFormError('')
    try {
      const result = await assessmentService.submit(draft.preSurveyId)
      await clearAssessmentDraft(account)
      await queryClient.invalidateQueries({ queryKey: keys.customerRequests })
      router.replace({ pathname: '/customer/request/[id]', params: { id: result.surveyRequestId } })
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'PRE_SURVEY_ALREADY_SUBMITTED') {
        await clearAssessmentDraft(account)
        await queryClient.invalidateQueries({ queryKey: keys.customerRequests })
        router.replace('/customer/requests')
      } else {
        if (reason instanceof ApiError && reason.code === 'PRE_SURVEY_INCOMPLETE') setStep(2)
        setFormError(fieldError(reason))
      }
    } finally { setPending(false) }
  }

  function addObstacle() {
    const key = `obstacle-${surface.obstacles.length + 1}`
    updateSurface({ obstacles: [...surface.obstacles, { key, name: `Vật cản ${surface.obstacles.length + 1}`, xM: '0', yM: '0', widthM: '1', lengthM: '1', heightM: '' }] })
  }

  function updateObstacle(index: number, patch: Partial<ObstacleForm>) {
    updateSurface({ obstacles: surface.obstacles.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) })
  }

  function removeObstacle(index: number) { updateSurface({ obstacles: surface.obstacles.filter((_, itemIndex) => itemIndex !== index) }) }

  if (loading) return <Screen><QueryState loading error={null} onRetry={() => undefined} /></Screen>
  if (loadError) return <Screen><StateView title="Không mở được bản đánh giá" description={loadError.message} action={<Button label="Thử lại" variant="secondary" onPress={() => { setLoadError(null); setLoading(true); setReloadKey((value) => value + 1) }} />} /></Screen>

  let content: ReactNode
  if (step === 0) {
    content = (
      <Panel>
        <SectionTitle detail="Chỉ khai một lần cho tài khoản này.">Thông tin khách hàng</SectionTitle>
        <ChoiceGroup label="Bạn lắp đặt cho" value={profile.customerType} options={[{ value: 1 as const, label: 'Cá nhân' }, { value: 2 as const, label: 'Doanh nghiệp' }]} onChange={(customerType) => updateProfile({ customerType })} />
        {profile.customerType === 2 ? <><Field label="Tên doanh nghiệp" value={profile.companyName} onChangeText={(companyName) => updateProfile({ companyName })} placeholder="Không bắt buộc" /><Field label="Mã số thuế" value={profile.taxCode} onChangeText={(taxCode) => updateProfile({ taxCode })} placeholder="Không bắt buộc" keyboardType="number-pad" /></> : null}
        <Field label="Ghi chú" value={profile.note} onChangeText={(note) => updateProfile({ note })} placeholder="Không bắt buộc" multiline />
      </Panel>
    )
  } else if (step === 1) {
    content = (
      <Panel>
        <SectionTitle detail="Toạ độ dùng để xếp lịch và tính đường đi.">Địa điểm lắp đặt</SectionTitle>
        <Field label="Tên địa điểm" value={site.name} onChangeText={(name) => updateSite({ name })} placeholder="Ví dụ: Nhà xưởng Quận 7" error={errors.name} />
        <Field label="Số nhà, tên đường" value={site.streetLine} onChangeText={(streetLine) => updateSite({ streetLine })} placeholder="Không bắt buộc" />
        <Field label="Phường, xã" value={site.ward} onChangeText={(ward) => updateSite({ ward })} placeholder="Ví dụ: Phường Tân Thuận" error={errors.ward} />
        <Field label="Tỉnh, thành phố" value="Thành phố Hồ Chí Minh" editable={false} />
        <View style={styles.twoColumns}>
          <View style={styles.column}><Field label="Vĩ độ" value={site.latitude} onChangeText={(latitude) => updateSite({ latitude })} placeholder="10.9036" keyboardType="decimal-pad" error={errors.latitude} /></View>
          <View style={styles.column}><Field label="Kinh độ" value={site.longitude} onChangeText={(longitude) => updateSite({ longitude })} placeholder="106.7686" keyboardType="decimal-pad" error={errors.longitude} /></View>
        </View>
        <ChoiceGroup label="Lắp trên bề mặt nào?" value={site.installationSurfaceType} options={surfaceTypes} onChange={(installationSurfaceType) => updateSite({ installationSurfaceType })} />
        <Field label="Vật liệu bề mặt" value={site.surfaceMaterial} onChangeText={(surfaceMaterial) => updateSite({ surfaceMaterial })} placeholder="Ví dụ: mái tôn, bê tông" />
      </Panel>
    )
  } else if (step === 2) {
    content = (
      <Panel>
        <SectionTitle detail="Đo trên bề mặt nghiêng, đơn vị mét.">Mặt lắp</SectionTitle>
        <View style={styles.twoColumns}>
          <View style={styles.column}><Field label="Chiều rộng (m)" value={surface.widthM} onChangeText={(widthM) => updateSurface({ widthM })} keyboardType="decimal-pad" error={errors.widthM} /></View>
          <View style={styles.column}><Field label="Chiều dài (m)" value={surface.lengthM} onChangeText={(lengthM) => updateSurface({ lengthM })} keyboardType="decimal-pad" error={errors.lengthM} /></View>
        </View>
        <Field label="Độ dốc (độ)" value={surface.tiltDegree} onChangeText={(tiltDegree) => updateSurface({ tiltDegree })} keyboardType="decimal-pad" error={errors.tiltDegree} />
        <ChoiceGroup label="Hướng mặt mái" value={surface.azimuthDegree} options={directions} onChange={(azimuthDegree) => updateSurface({ azimuthDegree })} />
        <View style={styles.obstacleHeading}>
          <View style={styles.obstacleTitle}><Text style={[styles.label, { color: theme.text }]}>Vật cản</Text><Text style={[styles.hint, { color: theme.textMuted }]}>{surface.obstacles.length ? `${surface.obstacles.length} vật cản` : 'Không có'}</Text></View>
          <Button label="Thêm vật cản" icon="add" variant="secondary" compact onPress={addObstacle} />
        </View>
        {errors.obstacles ? <Text style={[styles.error, { color: theme.danger }]}>{errors.obstacles}</Text> : null}
        {surface.obstacles.map((item, index) => (
          <View key={item.key} style={[styles.obstacle, { borderTopColor: theme.border }]}>
            <View style={styles.obstacleHeading}><Text style={[styles.obstacleName, { color: theme.text }]}>Vật cản {index + 1}</Text><Button label="Xoá" variant="quiet" compact onPress={() => removeObstacle(index)} /></View>
            <Field label="Tên vật cản" value={item.name} onChangeText={(name) => updateObstacle(index, { name })} error={errors[`obstacle-${index}-name`]} />
            <View style={styles.twoColumns}><View style={styles.column}><Field label="X (m)" value={item.xM} onChangeText={(xM) => updateObstacle(index, { xM })} keyboardType="decimal-pad" /></View><View style={styles.column}><Field label="Y (m)" value={item.yM} onChangeText={(yM) => updateObstacle(index, { yM })} keyboardType="decimal-pad" /></View></View>
            <View style={styles.twoColumns}><View style={styles.column}><Field label="Rộng (m)" value={item.widthM} onChangeText={(widthM) => updateObstacle(index, { widthM })} keyboardType="decimal-pad" /></View><View style={styles.column}><Field label="Dài (m)" value={item.lengthM} onChangeText={(lengthM) => updateObstacle(index, { lengthM })} keyboardType="decimal-pad" /></View></View>
            <Field label="Cao (m)" value={item.heightM} onChangeText={(heightM) => updateObstacle(index, { heightM })} keyboardType="decimal-pad" placeholder="Không bắt buộc" />
            {errors[`obstacle-${index}`] ? <Text style={[styles.error, { color: theme.danger }]}>{errors[`obstacle-${index}`]}</Text> : null}
          </View>
        ))}
      </Panel>
    )
  } else {
    content = (
      <View style={styles.reviewStack}>
        <Panel><SectionTitle>Địa điểm</SectionTitle><ReviewRow label="Tên công trình" value={site.name} /><ReviewRow label="Địa chỉ" value={[site.streetLine, site.ward, 'TP.HCM'].filter(Boolean).join(', ')} /><ReviewRow label="Toạ độ" value={`${site.latitude}, ${site.longitude}`} /></Panel>
        <Panel><SectionTitle>Mặt lắp</SectionTitle><ReviewRow label="Kích thước" value={`${surface.widthM} × ${surface.lengthM} m`} /><ReviewRow label="Độ dốc, hướng" value={`${surface.tiltDegree}° · ${directions.find((item) => item.value === surface.azimuthDegree)?.label}`} /><ReviewRow label="Tổng diện tích" value={parsedSurface ? `${parsedSurface.totalAreaM2.toLocaleString('vi-VN')} m²` : '—'} /><ReviewRow label="Dùng được" value={parsedSurface ? `${parsedSurface.usableAreaM2.toLocaleString('vi-VN')} m²` : '—'} /><ReviewRow label="Vật cản" value={surface.obstacles.length ? surface.obstacles.map((item) => item.name).join(', ') : 'Không có'} /></Panel>
        <View style={[styles.notice, { backgroundColor: theme.infoSoft }]}><Text style={[styles.noticeText, { color: theme.info }]}>Mô phỏng tấm pin không bắt buộc. Sau khi gửi, bạn chọn giờ để kỹ thuật viên tới đo lại tại công trình.</Text></View>
      </View>
    )
  }

  return (
    <Screen key={`assessment-step-${step}`}>
      <View style={styles.back}><IconButton label="Về danh sách yêu cầu" icon="arrow-back" onPress={() => router.navigate('/customer/requests')} /></View>
      <PageHeader eyebrow="Khách hàng" title="Đánh giá sơ bộ" description="Khai số liệu công trình để gửi yêu cầu khảo sát." />
      <StepBar current={step} firstStep={firstStep} />
      {content}
      {formError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger }]}>{formError}</Text> : null}
      <View style={styles.actions}>
        {step > firstStep && step < 2 ? <Button label="Quay lại" variant="quiet" onPress={() => setStep((value) => value - 1)} /> : null}
        {step === 0 ? <Button label="Tiếp tục: Địa điểm" onPress={() => void saveProfile()} loading={pending} /> : null}
        {step === 1 ? <Button label="Tiếp tục: Mặt lắp" onPress={() => void saveSite()} loading={pending} /> : null}
        {step === 2 ? <Button label="Lưu và xem lại" onPress={() => void saveSurface()} loading={pending} /> : null}
        {step === 3 ? <Button label="Gửi yêu cầu khảo sát" onPress={() => void submit()} loading={pending} /> : null}
      </View>
    </Screen>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme()
  return <View style={styles.reviewRow}><Text style={[styles.reviewLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.reviewValue, { color: theme.text }]}>{value}</Text></View>
}

const styles = StyleSheet.create({
  back: { marginLeft: -8, marginBottom: -12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  stepItem: { flex: 1, alignItems: 'center' },
  stepLine: { position: 'absolute', height: 2, left: '-50%', right: '50%', top: 14 },
  stepDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNumber: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  stepLabel: { marginTop: 9, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  choiceGroup: { gap: 8 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  twoColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  column: { flex: 1 },
  obstacleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  obstacleTitle: { gap: 2 },
  obstacle: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 14 },
  obstacleName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  actions: { gap: 10 },
  reviewStack: { gap: 16 },
  reviewRow: { gap: 3 },
  reviewLabel: { fontSize: 13, lineHeight: 18 },
  reviewValue: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  notice: { borderRadius: 6, padding: 14 },
  noticeText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
})
