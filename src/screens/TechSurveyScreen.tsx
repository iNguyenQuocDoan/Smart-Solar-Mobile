import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ActionBar, FieldRegistryProvider, Note, useFieldScroller } from '@/components/form'
import { MenuButton } from '@/components/SideMenu'
import { BomSection } from '@/components/survey/BomSection'
import { PhotosSection } from '@/components/survey/PhotosSection'
import { StartSurvey } from '@/components/survey/StartSurvey'
import { SurveySummary } from '@/components/survey/SurveySummary'
import {
  ElectricSection,
  LocationSection,
  ObstacleSection,
  PlanSection,
  RoofSection,
  declaredOf,
} from '@/components/survey/SurveySections'
import { BackButton, Button, QueryState, SCREEN_PADDING, StatusText } from '@/components/ui'
import { useTechJob } from '@/hooks/queries'
import { useCatalog, useCompleteSurvey, useOnsiteSurvey, useSaveSurvey } from '@/hooks/techJob'
import { ApiError, isStaleRevisionError } from '@/lib/api/errors'
import type { OnSiteSurveyView, TechnicianJob } from '@/lib/api/types'
import { clearSurveyDraft, loadSurveyDraft, saveSurveyDraft } from '@/lib/draftStorage'
import { formatMoment } from '@/lib/format'
import { BOM_ERROR_KEY, FIELD_ERROR_CODES, unitsOf } from '@/lib/onsiteSurvey/billOfMaterials'
import { onSiteSurveyStatusMeta } from '@/lib/onsiteSurvey/display'
import { draftChoice, type SurveyDraft } from '@/lib/onsiteSurvey/draft'
import {
  SURVEY_SECTIONS,
  clearTouchedErrors,
  errorCountBySection,
  firstErrorKey,
  formDiffers,
  formFromView,
  sectionOfField,
  serverOnSiteSurveyErrors,
  toRequest,
  validateOnSiteSurvey,
  type OnSiteSurveyErrors,
  type OnSiteSurveyForm,
  type SurveySection,
} from '@/lib/onsiteSurvey/form'
import { useAppTheme } from '@/theme/theme'

// Khảo sát tại công trình trên điện thoại, theo luật của backend (OnSiteSurveyHandlers), như OnSiteSurveyPanel của web:
// 1. "Bắt đầu khảo sát" khi tới nơi (sớm nhất 2 giờ trước giờ hẹn).
// 2. Nhập số đo theo từng phần, thêm ảnh; lưu bao nhiêu lần cũng được. Số đo tự giữ trên máy (nháp) để mất mạng hay tắt app
//    không mất; bản trên máy khác bản trên hệ thống thì báo "Chưa lưu lên hệ thống".
// 3. "Hoàn thành khảo sát": đủ ô bắt buộc và ít nhất một ảnh Mái. Sau đó chỉ sửa bằng bản bổ sung có lý do.
// Mọi lệnh ghi gửi `revision` đang sửa; biên bản đổi ở nơi khác (409) thì tải lại và hỏi người dùng, không ghi đè im lặng

export function TechSurveyScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const appointmentId = id ?? ''
  const job = useTechJob(appointmentId)
  const survey = useOnsiteSurvey(appointmentId, { enabled: Boolean(job.data) })
  const loading = job.isPending || (Boolean(job.data) && survey.isPending)
  const error = job.error ?? survey.error
  const view = survey.data ?? null
  const status = onSiteSurveyStatusMeta(view?.status)

  const header = (
    <View style={styles.header}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.titleRow}>
        <MenuButton />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Khảo sát tại công trình
        </Text>
      </View>
      {job.data ? (
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {job.data.property.name}
          </Text>
          {survey.isSuccess ? <StatusText tone={status.tone}>{status.label}</StatusText> : null}
        </View>
      ) : null}
    </View>
  )

  if (loading || error || !job.data)
    return (
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.canvas }]} edges={['top']}>
        {header}
        <View style={styles.pad}>
          <QueryState
            loading={loading}
            error={error}
            onRetry={() => void (job.error ? job.refetch() : survey.refetch())}
          />
        </View>
      </SafeAreaView>
    )

  if (view?.status === 'IN_PROGRESS')
    return (
      // key: đổi biên bản (hiếm) thì dựng lại form từ đầu
      <SurveyEditor key={view.reportId} job={job.data} survey={view} refreshing={survey.isFetching} header={header} />
    )

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.canvas }]} edges={['top']}>
      {header}
      <ScrollView contentContainerStyle={[styles.pad, styles.scrollEnd]}>
        {view?.status === 'COMPLETED' || job.data.status === 'COMPLETED' ? (
          view ? (
            <CompletedSurvey job={job.data} survey={view} />
          ) : (
            <Note>Lịch này đã xong nhưng không có biên bản khảo sát.</Note>
          )
        ) : (
          <StartSurvey job={job.data} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function CompletedSurvey({ survey }: { job: TechnicianJob; survey: OnSiteSurveyView }) {
  const catalog = useCatalog()
  return (
    <View style={styles.stack}>
      <Note tone="success">Đã hoàn thành lúc {formatMoment(survey.completedAt)}.</Note>
      <SurveySummary survey={survey} products={catalog.data?.items ?? undefined} />
      <PhotosSection appointmentId={survey.appointmentId} attachments={survey.attachments} disabled />
    </View>
  )
}

type DraftState =
  | { kind: 'loading' }
  | { kind: 'none' }
  | { kind: 'restored' }
  /** Bản trên hệ thống đổi sau khi sửa nháp: người dùng chọn giữ nháp hay lấy bản trên hệ thống */
  | { kind: 'conflict'; draft: SurveyDraft }

function SurveyEditor({
  job,
  survey,
  refreshing,
  header,
}: {
  job: TechnicianJob
  survey: OnSiteSurveyView
  refreshing: boolean
  header: React.ReactNode
}) {
  const theme = useAppTheme()
  const appointmentId = job.appointmentId
  const save = useSaveSurvey(appointmentId)
  const complete = useCompleteSurvey(appointmentId)
  const catalog = useCatalog()
  const [form, setForm] = useState<OnSiteSurveyForm>(() => formFromView(survey))
  /** `revision` của bản trên hệ thống mà form đang sửa tiếp; lệnh lưu gửi đúng số này */
  const [baseRevision, setBaseRevision] = useState(survey.revision)
  const [draft, setDraft] = useState<DraftState>({ kind: 'loading' })
  const [errors, setErrors] = useState<OnSiteSurveyErrors>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [stale, setStale] = useState(false)
  const [section, setSection] = useState<SurveySection>('roof')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const scrollRef = useRef<ScrollView>(null)
  const contentRef = useRef<View>(null)
  const pendingScroll = useRef<string | null>(null)
  const { registry, scrollTo } = useFieldScroller(scrollRef, contentRef)

  const units = useMemo(() => unitsOf(catalog.data?.items ?? []), [catalog.data])
  const dirty = formDiffers(form, survey)
  const busy = save.isPending || complete.isPending
  const blocked = stale || draft.kind === 'conflict' || draft.kind === 'loading'
  const roofPhotos = survey.attachments.filter((a) => a.category === 'ROOF').length
  const completion = validateOnSiteSurvey(form, { forCompletion: true, units })
  // Bảng vật tư không bắt buộc: lỗi của nó không tính là ô bắt buộc còn thiếu
  const missing = Object.keys(completion).filter((key) => !key.startsWith(BOM_ERROR_KEY))
  const sectionCounts = errorCountBySection({ ...completion, ...errors })

  // Mở màn: máy còn nháp thì dùng lại, hoặc hỏi khi bản trên hệ thống đã đổi
  useEffect(() => {
    let alive = true
    void loadSurveyDraft(appointmentId).then((saved) => {
      if (!alive) return
      const choice = draftChoice(saved, survey)
      if (choice === 'restore' && saved) {
        setForm(saved.form)
        setDraft({ kind: 'restored' })
      } else if (choice === 'conflict' && saved) setDraft({ kind: 'conflict', draft: saved })
      else {
        void clearSurveyDraft(appointmentId)
        setDraft({ kind: 'none' })
      }
    })
    return () => {
      alive = false
    }
    // Chỉ đọc nháp một lần khi mở màn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId])

  // Tự giữ nháp trên máy sau mỗi lần sửa; giống bản trên hệ thống thì xoá nháp
  useEffect(() => {
    if (draft.kind === 'loading' || draft.kind === 'conflict') return
    const timer = setTimeout(() => {
      if (formDiffers(form, survey))
        void saveSurveyDraft({ appointmentId, revision: baseRevision, form, savedAt: new Date().toISOString() })
      else void clearSurveyDraft(appointmentId)
    }, 500)
    return () => clearTimeout(timer)
  }, [form, survey, baseRevision, draft.kind, appointmentId])

  // Sau khi chuyển phần, cuộn tới ô cần sửa (ô chỉ đo được vị trí khi phần của nó đã dựng)
  useEffect(() => {
    const target = pendingScroll.current
    pendingScroll.current = null
    const timer = setTimeout(() => {
      if (!target || !scrollTo(target)) scrollRef.current?.scrollTo({ y: 0, animated: false })
    }, 80)
    return () => clearTimeout(timer)
  }, [section, scrollTo])

  function goToField(key: string) {
    const target = sectionOfField(key)
    if (target === section) scrollTo(key)
    else {
      pendingScroll.current = key
      setSection(target)
    }
  }

  function change(patch: Partial<OnSiteSurveyForm>) {
    setForm((current) => ({ ...current, ...patch }))
    setErrors((current) => clearTouchedErrors(current, Object.keys(patch)))
    setActionError(null)
  }

  function showErrors(found: OnSiteSurveyErrors, message: string) {
    setErrors(found)
    setActionError(message)
    const first = firstErrorKey(found)
    if (first) goToField(first)
  }

  function handleError(e: unknown) {
    if (e instanceof ApiError && FIELD_ERROR_CODES.includes(e.code ?? '') && e.fieldErrors) {
      const found = serverOnSiteSurveyErrors(e.fieldErrors, form)
      setErrors(found)
      const first = firstErrorKey(found)
      if (first) goToField(first)
    }
    if (isStaleRevisionError(e)) setStale(true)
    setActionError(e instanceof Error ? e.message : 'Vui lòng thử lại.')
  }

  /** Lưu lên hệ thống, trả về biên bản mới (hoặc null khi lỗi) */
  async function persist(): Promise<OnSiteSurveyView | null> {
    const found = validateOnSiteSurvey(form, { forCompletion: false, units })
    if (Object.keys(found).length > 0) {
      showErrors(found, 'Sửa các ô được đánh dấu.')
      return null
    }
    try {
      const saved = await save.mutateAsync(toRequest(form, baseRevision))
      setBaseRevision(saved.revision)
      setSavedAt(saved.updatedAt)
      setDraft({ kind: 'none' })
      return saved
    } catch (e) {
      handleError(e)
      return null
    }
  }

  async function saveOnly() {
    setActionError(null)
    await persist()
  }

  function askComplete() {
    setActionError(null)
    const found = validateOnSiteSurvey(form, { forCompletion: true, units })
    if (Object.keys(found).length > 0) {
      showErrors(found, 'Còn ô thiếu hoặc sai. Sửa các ô được đánh dấu.')
      return
    }
    if (roofPhotos === 0) {
      setActionError('Cần ít nhất một ảnh Mái.')
      setSection('photos')
      return
    }
    Alert.alert(
      'Hoàn thành khảo sát?',
      `${dirty ? 'Phần chưa lưu sẽ được lưu trước. ' : ''}Hoàn thành rồi thì không sửa trên điện thoại được.`,
      [
        { text: 'Xem lại', style: 'cancel' },
        { text: 'Hoàn thành', onPress: () => void confirmComplete() },
      ],
    )
  }

  async function confirmComplete() {
    setActionError(null)
    const latest = dirty ? await persist() : survey
    if (!latest) return
    try {
      await complete.mutateAsync(latest.revision)
      void clearSurveyDraft(appointmentId)
    } catch (e) {
      handleError(e)
    }
  }

  /** Bỏ phần đang nhập, lấy bản mới nhất trên hệ thống */
  function takeServer() {
    setForm(formFromView(survey))
    setBaseRevision(survey.revision)
    setErrors({})
    setActionError(null)
    setStale(false)
    setDraft({ kind: 'none' })
    void clearSurveyDraft(appointmentId)
  }

  /** Giữ phần đang nhập (hoặc nháp trên máy); lần lưu sau ghi đè bản trên hệ thống vì người dùng đã chọn vậy */
  function keepMine(next?: OnSiteSurveyForm) {
    if (next) setForm(next)
    setBaseRevision(survey.revision)
    setActionError(null)
    setStale(false)
    setDraft({ kind: 'restored' })
  }

  const saveText = busy
    ? 'Đang gửi…'
    : dirty
      ? 'Chưa lưu, đang giữ trên máy.'
      : savedAt
        ? `Đã lưu lúc ${formatMoment(savedAt)}`
        : 'Đã lưu'

  function renderSection() {
    const props = { value: form, errors, onChange: change, disabled: busy || blocked }
    switch (section) {
      case 'roof':
        return <RoofSection {...props} declared={declaredOf(job)} />
      case 'electric':
        return <ElectricSection {...props} />
      case 'plan':
        return <PlanSection {...props} />
      case 'bom':
        return (
          <BomSection
            {...props}
            catalog={{
              products: catalog.data?.items ?? undefined,
              loading: catalog.isPending,
              error: catalog.error ? catalog.error.message : null,
            }}
          />
        )
      case 'obstacles':
        return <ObstacleSection {...props} />
      case 'location':
        return <LocationSection {...props} />
      case 'photos':
        return <PhotosSection appointmentId={appointmentId} attachments={survey.attachments} disabled={busy} />
    }
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.canvas }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {header}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabs, { borderBottomColor: theme.border }]}
          contentContainerStyle={styles.tabsContent}
          accessibilityRole="tablist"
        >
          {SURVEY_SECTIONS.map((s) => {
            const active = s.key === section
            const count = s.key === 'photos' ? (roofPhotos === 0 ? 1 : 0) : (sectionCounts[s.key] ?? 0)
            return (
              <Pressable
                key={s.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${s.label}${count ? `, còn ${count} mục` : ''}`}
                onPress={() => setSection(s.key)}
                style={[styles.tab, { borderBottomColor: active ? theme.brandText : 'transparent' }]}
              >
                <Text numberOfLines={1} style={[styles.tabText, { color: active ? theme.brandText : theme.text }]}>
                  {s.label}
                  {count ? <Text style={{ color: theme.danger }}> {count}</Text> : null}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.pad}>
          <View ref={contentRef} collapsable={false} style={styles.stack}>
            {draft.kind === 'loading' ? <ActivityIndicator color={theme.brand} /> : null}
            {draft.kind === 'conflict' ? (
              <View style={[styles.notice, { borderLeftColor: theme.warning }]}>
                <Note tone="warning">
                  Máy còn số đo chưa lưu lúc {formatMoment(draft.draft.savedAt)}, nhưng biên bản đã được sửa ở nơi khác.
                  Chọn bản muốn dùng.
                </Note>
                <View style={styles.row}>
                  <Button label="Dùng số đo trên máy" compact onPress={() => keepMine(draft.draft.form)} />
                  <Button label="Lấy bản mới nhất" variant="secondary" compact onPress={takeServer} />
                </View>
              </View>
            ) : null}
            {stale ? (
              <View style={[styles.notice, { borderLeftColor: theme.warning }]}>
                <Note tone="warning">
                  Biên bản vừa được sửa ở nơi khác. Giữ phần đang nhập thì lần lưu sau sẽ ghi đè bản đó.
                </Note>
                <View style={styles.row}>
                  <Button label="Lấy bản mới nhất" compact loading={refreshing} onPress={takeServer} />
                  <Button
                    label="Giữ phần đang nhập"
                    variant="secondary"
                    compact
                    disabled={refreshing}
                    onPress={() => keepMine()}
                  />
                </View>
              </View>
            ) : null}
            {section === 'roof' ? (
              <Note>Bắt đầu lúc {formatMoment(survey.startedAt)}. Ô có dấu * bắt buộc để hoàn thành.</Note>
            ) : null}
            <FieldRegistryProvider registry={registry}>{renderSection()}</FieldRegistryProvider>
          </View>
        </ScrollView>

        <ActionBar>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Chuyển tới ô bắt buộc đầu tiên còn thiếu"
            disabled={missing.length === 0 && roofPhotos > 0}
            onPress={() => {
              const first = firstErrorKey(Object.fromEntries(missing.map((k) => [k, completion[k]])))
              if (first) goToField(first)
              else if (roofPhotos === 0) setSection('photos')
            }}
          >
            <Text style={[styles.summary, { color: theme.text }]}>
              <Text style={{ color: missing.length ? theme.danger : theme.success }}>
                {missing.length ? `Còn ${missing.length} ô bắt buộc` : 'Đủ ô bắt buộc'}
              </Text>
              {', '}
              <Text style={{ color: roofPhotos ? theme.success : theme.danger }}>
                {roofPhotos ? `${roofPhotos} ảnh mái` : 'chưa có ảnh mái'}
              </Text>
              {missing.length || !roofPhotos ? <Text style={{ color: theme.brandText }}>. Tới ô thiếu</Text> : null}
            </Text>
          </Pressable>
          <Note tone={dirty ? 'warning' : 'muted'}>{saveText}</Note>
          {actionError ? <Note tone="danger">{actionError}</Note> : null}
          <View style={styles.row}>
            <View style={styles.saveButton}>
              <Button
                label="Lưu"
                icon="save-outline"
                variant="secondary"
                loading={save.isPending && !complete.isPending}
                disabled={busy || blocked || !dirty}
                onPress={() => void saveOnly()}
              />
            </View>
            <View style={styles.fill}>
              <Button
                label="Hoàn thành khảo sát"
                icon="checkmark-done"
                loading={complete.isPending}
                disabled={busy || blocked}
                onPress={askComplete}
              />
            </View>
          </View>
        </ActionBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { paddingHorizontal: SCREEN_PADDING, paddingTop: 4, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  meta: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  pad: { paddingHorizontal: SCREEN_PADDING, paddingTop: 12, paddingBottom: 24 },
  scrollEnd: { gap: 12 },
  stack: { gap: 16 },
  tabs: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  tabsContent: { paddingHorizontal: SCREEN_PADDING - 4 },
  tab: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 10, borderBottomWidth: 3 },
  tabText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  notice: { borderLeftWidth: 3, paddingLeft: 10, gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveButton: { minWidth: 100 },
  summary: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
})
