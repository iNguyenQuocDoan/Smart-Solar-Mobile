import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Linking, StyleSheet, Text, View } from 'react-native'
import { PhotoButtons, PhotoGrid, pickPhotos } from '@/components/Photos'
import {
  BackButton,
  Button,
  ChoiceGroup,
  Field,
  KeyValue,
  ListRow,
  PageHeader,
  Panel,
  QueryState,
  Screen,
  SectionTitle,
  StatusText,
} from '@/components/ui'
import { useInstallationWrite, useProducts, useTechInstallation } from '@/hooks/queries'
import { techInstallationService } from '@/lib/api/services'
import type { InstallationProject } from '@/lib/api/types'
import { formatMoment } from '@/lib/format'
import { assetTypeLabel, assetUnits } from '@/lib/installation'
import {
  ASSET_TYPES,
  REASON_MAX,
  REPORT_MAX,
  assignmentEnded,
  awaitsAnswer,
  awaitsStart,
  canWork,
  installationStatus,
  lotRequest,
  missingAssetTypes,
  nextStep,
  productsForAsset,
  roundPhotoCount,
  showsWork,
  validateLot,
  type AssetLot,
  type AssetLotErrors,
} from '@/lib/techInstallation'
import { useAppTheme } from '@/theme/theme'

// Một công trình lắp đặt được giao: nhận / từ chối, bắt đầu, chụp ảnh, ghi thiết bị đã lắp theo lô, gửi báo cáo hoàn thành để
// quản lý nghiệm thu. Kỹ thuật viên không thấy checklist hay nhật ký nội bộ

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Vui lòng thử lại.')

export function TechInstallationScreen() {
  const router = useRouter()
  const theme = useAppTheme()
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const query = useTechInstallation(id)
  const [now] = useState(() => Date.now())
  const view = query.data
  const step = view ? nextStep(view, now) : { text: '', tone: 'neutral' as const }
  const answering = view ? awaitsAnswer(view) : false
  const starting = view ? awaitsStart(view) && view.canStart : false

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <BackButton onPress={() => router.back()} />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {view ? (
        <>
          <View style={styles.heading}>
            <PageHeader
              title={view.site?.propertyName ?? 'Công trình lắp đặt'}
              description={`${formatMoment(view.startsAt)} đến ${formatMoment(view.endsAt)}`}
            />
            <StatusText tone={installationStatus(view).tone}>{installationStatus(view).label}</StatusText>
          </View>
          {step.text || answering || starting ? (
            <Panel>
              <SectionTitle detail={view.currentRound > 1 ? `Lượt ${view.currentRound}` : undefined}>
                Tình hình
              </SectionTitle>
              {step.text ? (
                <Text style={[styles.body, { color: step.tone === 'danger' ? theme.danger : theme.text }]}>
                  {step.text}
                </Text>
              ) : null}
              {answering ? <AnswerAssignment view={view} ended={assignmentEnded(view, now)} /> : null}
              {starting ? <StartInstallation view={view} /> : null}
            </Panel>
          ) : null}
          {showsWork(view) ? <InstallationPhotos view={view} /> : null}
          {showsWork(view) ? <InstalledAssets view={view} /> : null}
          {canWork(view) || view.acceptances.length > 0 ? <CompletionReport view={view} /> : null}
          {view.site ? (
            <Panel>
              <SectionTitle>Công trình</SectionTitle>
              <KeyValue
                label="Địa chỉ"
                value={
                  [view.site.streetLine, view.site.ward, view.site.district, view.site.province]
                    .filter(Boolean)
                    .join(', ') || '—'
                }
              />
              <KeyValue label="Khu vực" value={view.zoneName ?? '—'} />
              <KeyValue label="Khách hàng" value={view.site.customerName || '—'} />
              <KeyValue label="Điện thoại" value={view.site.customerPhone || '—'} />
              <View style={styles.actions}>
                <Button
                  label="Mở bản đồ"
                  icon="map-outline"
                  variant="secondary"
                  compact
                  onPress={() => {
                    const s = view.site!
                    const address = [s.streetLine, s.ward, s.district, s.province].filter(Boolean).join(', ')
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
                    )
                  }}
                />
                {view.site.customerPhone ? (
                  <Button
                    label="Gọi khách"
                    icon="call-outline"
                    variant="secondary"
                    compact
                    onPress={() => void Linking.openURL(`tel:${view.site!.customerPhone}`)}
                  />
                ) : null}
              </View>
            </Panel>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

function AnswerAssignment({ view, ended }: { view: InstallationProject; ended: boolean }) {
  const theme = useAppTheme()
  const accept = useInstallationWrite(view.projectId, () =>
    techInstallationService.accept(view.projectId, view.revision),
  )
  const decline = useInstallationWrite(view.projectId, (reason: string) =>
    techInstallationService.decline(view.projectId, view.revision, reason),
  )
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const busy = accept.isPending || decline.isPending

  async function submitDecline() {
    if (!reason.trim()) return setError('Ghi lý do từ chối để quản lý giao người khác.')
    try {
      await decline.mutateAsync(reason.trim())
    } catch (e) {
      setError(errorText(e))
    }
  }

  if (declining)
    return (
      <View style={styles.form}>
        <Field
          label="Lý do từ chối"
          value={reason}
          onChangeText={(value) => {
            setReason(value)
            setError('')
          }}
          multiline
          maxLength={REASON_MAX}
          placeholder="Ví dụ: trùng lịch lắp đặt ở công trình khác"
          error={error || undefined}
        />
        <View style={styles.actions}>
          <Button label="Thôi" variant="secondary" compact disabled={busy} onPress={() => setDeclining(false)} />
          <Button
            label="Xác nhận từ chối"
            variant="danger"
            compact
            loading={decline.isPending}
            onPress={() => void submitDecline()}
          />
        </View>
      </View>
    )
  return (
    <View style={styles.form}>
      <View style={styles.actions}>
        {ended ? null : (
          <Button
            label="Nhận việc"
            icon="checkmark-circle-outline"
            loading={accept.isPending}
            disabled={busy}
            onPress={() => {
              setError('')
              accept.mutateAsync(undefined).catch((e: unknown) => setError(errorText(e)))
            }}
          />
        )}
        <Button
          label="Từ chối"
          icon="close-circle-outline"
          variant="danger"
          disabled={busy}
          onPress={() => setDeclining(true)}
        />
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  )
}

function StartInstallation({ view }: { view: InstallationProject }) {
  const theme = useAppTheme()
  const start = useInstallationWrite(view.projectId, () => techInstallationService.start(view.projectId))
  const [error, setError] = useState('')
  return (
    <>
      <Button
        label="Bắt đầu lắp đặt"
        icon="play-outline"
        loading={start.isPending}
        onPress={() => {
          setError('')
          start.mutateAsync(undefined).catch((e: unknown) => setError(errorText(e)))
        }}
      />
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </>
  )
}

function InstallationPhotos({ view }: { view: InstallationProject }) {
  const theme = useAppTheme()
  const add = useInstallationWrite(view.projectId, (image: Parameters<typeof techInstallationService.addPhoto>[1]) =>
    techInstallationService.addPhoto(view.projectId, image),
  )
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const work = canWork(view)

  async function upload(source: 'camera' | 'library') {
    setError('')
    try {
      const images = await pickPhotos(source)
      for (const [i, image] of images.entries()) {
        setProgress(`Đang tải ảnh ${i + 1}/${images.length}…`)
        await add.mutateAsync(image)
      }
    } catch (e) {
      setError(errorText(e))
    } finally {
      setProgress('')
    }
  }

  return (
    <Panel>
      <SectionTitle>Ảnh lắp đặt</SectionTitle>
      {work ? <PhotoButtons disabled={Boolean(progress)} onPick={(source) => void upload(source)} /> : null}
      {progress ? <Text style={[styles.meta, { color: theme.textMuted }]}>{progress}</Text> : null}
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <PhotoGrid
        items={[...view.evidence].reverse().map((e) => ({
          id: e.evidenceId,
          label: view.currentRound > 1 ? `Lượt ${e.round}` : '',
          fetchUrl: () => techInstallationService.photoUrl(view.projectId, e.evidenceId),
        }))}
      />
    </Panel>
  )
}

const emptyLot = (): AssetLot => ({ assetType: 'PANEL', productId: null, quantity: '', warrantyMonths: '' })

function InstalledAssets({ view }: { view: InstallationProject }) {
  const theme = useAppTheme()
  const [adding, setAdding] = useState(false)
  const differences = view.equipment?.differences ?? []
  const work = canWork(view)
  return (
    <Panel>
      <SectionTitle
        detail={view.assets.length ? `${assetUnits(view.assets).toLocaleString('vi-VN')} thiết bị` : undefined}
      >
        Thiết bị đã lắp
      </SectionTitle>
      {view.assets.length === 0 ? (
        <Text style={[styles.meta, { color: theme.textMuted }]}>Chưa ghi thiết bị nào.</Text>
      ) : (
        view.assets.map((a, i) => (
          <ListRow key={a.assetId} last={i === view.assets.length - 1}>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: theme.text }]}>
                {assetTypeLabel(a.assetType)}: {a.manufacturer} {a.model}
              </Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {a.warrantyMonths != null ? `Bảo hành ${a.warrantyMonths} tháng` : 'Chưa ghi bảo hành'}
              </Text>
            </View>
            <Text style={[styles.quantity, { color: theme.text }]}>× {a.quantity.toLocaleString('vi-VN')}</Text>
          </ListRow>
        ))
      )}
      {differences.length > 0 ? (
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.text }]}>Chưa khớp hợp đồng</Text>
          {differences.map((d) => (
            <Text key={d.productId} style={[styles.meta, { color: theme.warning }]}>
              {d.name ?? 'Sản phẩm'}: hợp đồng {d.contractedQuantity.toLocaleString('vi-VN')}, đã ghi{' '}
              {d.installedQuantity.toLocaleString('vi-VN')}
            </Text>
          ))}
        </View>
      ) : null}
      {work && !adding ? (
        <Button label="Ghi thiết bị" icon="add" variant="secondary" compact onPress={() => setAdding(true)} />
      ) : null}
      {work && adding ? <AssetLotForm view={view} onClose={() => setAdding(false)} /> : null}
    </Panel>
  )
}

// Ghi một lô: loại, sản phẩm danh mục (thiết bị trong hợp đồng lên đầu), số lượng, bảo hành. Ghi rồi không xoá được nên hỏi lại
function AssetLotForm({ view, onClose }: { view: InstallationProject; onClose: () => void }) {
  const theme = useAppTheme()
  const products = useProducts('')
  const save = useInstallationWrite(view.projectId, (assets: unknown[]) =>
    techInstallationService.addAssets(view.projectId, assets),
  )
  const [lot, setLot] = useState<AssetLot>(emptyLot)
  const [errors, setErrors] = useState<AssetLotErrors>({})
  const [error, setError] = useState('')
  const contracted = (view.equipment?.differences ?? []).filter((d) => d.contractedQuantity > 0).map((d) => d.productId)
  const options = productsForAsset(products.data?.items ?? [], lot.assetType, contracted)
  const product = options.find((p) => p.id === lot.productId)

  function change(patch: Partial<AssetLot>) {
    setLot((current) => ({ ...current, ...patch }))
    setErrors({})
    setError('')
  }

  function askSave() {
    const found = validateLot(lot)
    if (Object.keys(found).length > 0 || !product) return setErrors(found)
    Alert.alert(
      'Ghi lô thiết bị này?',
      `${product.name}: ${lot.quantity} ${product.unit || 'thiết bị'}. Thiết bị đã ghi không xoá được.`,
      [
        { text: 'Xem lại', style: 'cancel' },
        {
          text: 'Ghi thiết bị',
          onPress: () =>
            save
              .mutateAsync([lotRequest(lot, product)])
              .then(() => {
                setLot(emptyLot())
                onClose()
              })
              .catch((e: unknown) => setError(errorText(e))),
        },
      ],
    )
  }

  return (
    <View style={styles.form}>
      <ChoiceGroup
        label="Loại thiết bị"
        value={lot.assetType}
        options={ASSET_TYPES}
        onChange={(assetType) => change({ assetType, productId: null, warrantyMonths: '' })}
      />
      <Text style={[styles.label, { color: theme.text }]}>Sản phẩm</Text>
      <QueryState loading={products.isPending} error={products.error} onRetry={() => void products.refetch()} />
      {products.isSuccess && options.length === 0 ? (
        <Text style={[styles.meta, { color: theme.textMuted }]}>Danh mục chưa có sản phẩm loại này.</Text>
      ) : null}
      {options.map((p, i) => {
        const selected = p.id === lot.productId
        return (
          <ListRow
            key={p.id}
            last={i === options.length - 1}
            onPress={() =>
              change({ productId: p.id!, warrantyMonths: p.warrantyMonth != null ? String(p.warrantyMonth) : '' })
            }
            accessibilityLabel={`Chọn ${p.name}`}
            style={selected ? { backgroundColor: theme.brandSoft } : undefined}
          >
            <View style={styles.flex}>
              <Text style={[styles.name, { color: selected ? theme.brandText : theme.text }]}>{p.name}</Text>
              <Text style={[styles.meta, { color: theme.textMuted }]}>
                {[contracted.includes(p.id!) ? 'Theo hợp đồng' : null, p.brand, p.model].filter(Boolean).join(', ')}
              </Text>
            </View>
          </ListRow>
        )
      })}
      {errors.productId ? <Text style={[styles.error, { color: theme.danger }]}>{errors.productId}</Text> : null}
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field
            label={`Số lượng${product?.unit ? ` (${product.unit})` : ''}`}
            value={lot.quantity}
            onChangeText={(quantity) => change({ quantity })}
            keyboardType="number-pad"
            error={errors.quantity}
          />
        </View>
        <View style={styles.flex}>
          <Field
            label="Bảo hành (tháng)"
            value={lot.warrantyMonths}
            onChangeText={(warrantyMonths) => change({ warrantyMonths })}
            keyboardType="number-pad"
            error={errors.warrantyMonths}
          />
        </View>
      </View>
      <View style={styles.actions}>
        <Button label="Thôi" variant="secondary" compact disabled={save.isPending} onPress={onClose} />
        <Button label="Ghi thiết bị" icon="save-outline" compact loading={save.isPending} onPress={askSave} />
      </View>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </View>
  )
}

function CompletionReport({ view }: { view: InstallationProject }) {
  const theme = useAppTheme()
  const report = useInstallationWrite(view.projectId, (text: string) =>
    techInstallationService.report(view.projectId, view.revision, text),
  )
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const work = canWork(view)
  const missing = missingAssetTypes(view).map((type) => assetTypeLabel(type).toLowerCase())
  const photos = roundPhotoCount(view)

  function askSend() {
    setError('')
    if (!text.trim()) return setError('Viết nội dung báo cáo: đã lắp gì, đấu nối thế nào, còn gì cần lưu ý.')
    if (photos === 0) return setError(`Cần ít nhất một ảnh của lượt ${view.currentRound}.`)
    if (missing.length > 0) return setError(`Chưa ghi ${missing.join(' và ')} đã lắp.`)
    Alert.alert('Gửi báo cáo hoàn thành?', 'Công trình chuyển sang chờ quản lý nghiệm thu.', [
      { text: 'Xem lại', style: 'cancel' },
      {
        text: 'Gửi báo cáo',
        onPress: () =>
          report
            .mutateAsync(text.trim())
            .then(() => setText(''))
            .catch((e: unknown) => setError(errorText(e))),
      },
    ])
  }

  return (
    <Panel>
      <SectionTitle>Báo cáo hoàn thành</SectionTitle>
      {work ? (
        <>
          {photos === 0 || missing.length ? (
            <Text style={[styles.meta, { color: theme.warning }]}>
              Chưa{' '}
              {[photos === 0 ? 'có ảnh lượt này' : null, missing.length ? `ghi ${missing.join(', ')}` : null]
                .filter(Boolean)
                .join(', chưa ')}
            </Text>
          ) : null}
          <Field
            label="Nội dung báo cáo"
            value={text}
            onChangeText={(value) => {
              setText(value)
              setError('')
            }}
            multiline
            maxLength={REPORT_MAX}
            error={error || undefined}
          />
          <Button label="Gửi báo cáo hoàn thành" icon="send-outline" loading={report.isPending} onPress={askSend} />
        </>
      ) : null}
      {[...view.acceptances]
        .sort((a, b) => b.round - a.round)
        .map((a) => (
          <View key={a.round} style={styles.history}>
            <Text style={[styles.name, { color: theme.text }]}>
              Lượt {a.round}, gửi {formatMoment(a.requestedAt)}
            </Text>
            <Text style={[styles.body, { color: theme.text }]}>{a.completionReport}</Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              {a.decision === 'PENDING'
                ? 'Chờ nghiệm thu.'
                : `${a.decision === 'ACCEPTED' ? 'Đã nghiệm thu' : 'Yêu cầu sửa lại'} lúc ${formatMoment(a.decidedAt)}${a.reason ? `: ${a.reason}` : '.'}`}
            </Text>
          </View>
        ))}
    </Panel>
  )
}

const styles = StyleSheet.create({
  heading: { gap: 2 },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  error: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  quantity: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { gap: 8 },
  history: { gap: 2, paddingTop: 4 },
})
