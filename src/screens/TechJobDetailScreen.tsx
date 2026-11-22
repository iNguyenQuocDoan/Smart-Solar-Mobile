import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Linking, StyleSheet, Text, View } from 'react-native'
import { useReleaseJob, useTechJob } from '@/hooks/queries'
import { useOnsiteSurvey } from '@/hooks/techJob'
import type { TechnicianJob } from '@/lib/api/types'
import { appointmentStatus, surfaceLabel } from '@/lib/status'
import { formatAppointment, shortCode } from '@/lib/format'
import {
  BackButton,
  Button,
  Field,
  KeyValue,
  PageHeader,
  Panel,
  QueryState,
  Screen,
  SectionTitle,
  StatusText,
} from '@/components/ui'
import { JobSteps } from '@/components/survey/JobSteps'
import { useAppTheme } from '@/theme/theme'

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (value: number | null | undefined) => (value == null ? '—' : number.format(value))

const WAITING = new Set(['ACCEPTED', 'ASSIGNED'])

/** Các bước bên dưới đã nói việc tiếp theo; chỉ nhắc khi quá giờ mà chưa bắt đầu khảo sát */
function overdueNote(job: TechnicianJob, surveyStarted: boolean, now: number) {
  if (!WAITING.has(job.status) || surveyStarted) return null
  return new Date(job.endsAt).getTime() < now ? 'Quá giờ hẹn. Chưa khảo sát được thì báo kinh doanh đổi giờ.' : null
}

// Trả lại việc đã nhận (bắt buộc ghi lý do), lịch quay về chờ kỹ thuật viên khác trong khu vực nhận
function ReleaseAction({ id }: { id: string }) {
  const router = useRouter()
  const release = useReleaseJob(id)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    if (!reason.trim()) {
      setError('Ghi lý do trả lại việc.')
      return
    }
    try {
      await release.mutateAsync(reason.trim())
      Alert.alert('Đã trả lại việc', 'Lịch quay về chờ kỹ thuật viên khác nhận.')
      router.back()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vui lòng thử lại.')
    }
  }

  if (!open)
    return (
      <Button
        label="Trả lại việc"
        icon="arrow-undo-outline"
        variant="secondary"
        compact
        onPress={() => setOpen(true)}
      />
    )
  return (
    <View style={styles.release}>
      <Field
        label="Lý do trả lại"
        value={reason}
        onChangeText={(text) => {
          setReason(text)
          setError('')
        }}
        placeholder="Ví dụ: trùng việc gấp ở công trình khác"
        multiline
        maxLength={500}
        error={error || undefined}
      />
      <View style={styles.actions}>
        <Button label="Huỷ" variant="secondary" compact disabled={release.isPending} onPress={() => setOpen(false)} />
        <Button
          label="Xác nhận trả lại"
          icon="arrow-undo-outline"
          variant="danger"
          compact
          loading={release.isPending}
          onPress={() => void submit()}
        />
      </View>
    </View>
  )
}

export function TechJobDetailScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useTechJob(id ?? '')
  const [now] = useState(() => Date.now())
  const job = query.data
  const survey = useOnsiteSurvey(id ?? '', { enabled: job ? WAITING.has(job.status) : false })
  const surveyStarted = Boolean(survey.data)

  // Tìm theo địa chỉ: toạ độ lưu kèm địa điểm chỉ là điểm giữa khu vực, không dùng để chỉ đường
  function openMap() {
    if (!job) return
    const p = job.property
    const address = [p.streetLine, p.ward, p.district, p.province].filter(Boolean).join(', ')
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
  }

  const status = job ? appointmentStatus(job.status, 'technician') : null
  const canRelease = job ? WAITING.has(job.status) && !surveyStarted && new Date(job.startsAt).getTime() > now : false
  const note = job && survey.isFetched ? overdueNote(job, surveyStarted, now) : null
  const pre = job?.preSurvey
  const declared = pre
    ? [
        pre.surfaceWidthM != null
          ? { label: 'Rộng × dài', value: `${n(pre.surfaceWidthM)} × ${n(pre.surfaceLengthM)} m` }
          : null,
        pre.usableAreaM2 != null || pre.totalAreaM2 != null
          ? { label: 'Dùng được / tổng', value: `${n(pre.usableAreaM2)} / ${n(pre.totalAreaM2)} m²` }
          : null,
        pre.surfaceTiltDegree != null ? { label: 'Độ dốc', value: `${n(pre.surfaceTiltDegree)}°` } : null,
        pre.obstacleCount > 0 || pre.hasObstruction
          ? { label: 'Vật cản', value: pre.obstacleCount > 0 ? `${pre.obstacleCount} vật cản` : 'Có' }
          : null,
      ].filter((row) => row !== null)
    : []

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <BackButton onPress={() => router.back()} />
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {job && status ? (
        <>
          <View style={styles.heading}>
            <PageHeader title={job.property.name} description={formatAppointment(job.startsAt, job.endsAt)} />
            <View style={styles.metaRow}>
              <StatusText tone={status.tone}>{status.label}</StatusText>
              <Text style={[styles.code, { color: theme.textMuted }]}>Mã {shortCode(job.surveyRequestId)}</Text>
            </View>
          </View>
          {note || canRelease ? (
            <Panel>
              <SectionTitle>Tình hình</SectionTitle>
              {note ? <Text style={[styles.body, { color: theme.danger }]}>{note}</Text> : null}
              {canRelease ? <ReleaseAction id={job.appointmentId} /> : null}
            </Panel>
          ) : null}
          <JobSteps job={job} />
          <Panel>
            <SectionTitle>Công trình</SectionTitle>
            <KeyValue
              label="Địa chỉ"
              value={
                [job.property.streetLine, job.property.ward, job.property.district, job.property.province]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
            <KeyValue label="Bề mặt" value={surfaceLabel(job.property.installationSurfaceType)} />
            {job.property.surfaceMaterial ? <KeyValue label="Vật liệu" value={job.property.surfaceMaterial} /> : null}
            <Button label="Mở bản đồ" icon="map-outline" variant="secondary" compact onPress={openMap} />
          </Panel>
          {declared.length ? (
            <Panel>
              <SectionTitle>Số liệu khách khai</SectionTitle>
              {declared.map((row) => (
                <KeyValue key={row.label} label={row.label} value={row.value} />
              ))}
            </Panel>
          ) : null}
          <Panel>
            <SectionTitle>Khách hàng</SectionTitle>
            <KeyValue label="Họ tên" value={job.customer.fullName || '—'} />
            <KeyValue label="Điện thoại" value={job.customer.phone || '—'} />
            {job.customer.email ? <KeyValue label="Email" value={job.customer.email} /> : null}
            {job.customer.phone ? (
              <Button
                label="Gọi khách"
                icon="call-outline"
                variant="secondary"
                compact
                onPress={() => void Linking.openURL(`tel:${job.customer.phone}`)}
              />
            ) : null}
            {job.customerNote ? <KeyValue label="Ghi chú" value={job.customerNote} /> : null}
          </Panel>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  heading: { gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  code: { fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  body: { fontSize: 14, lineHeight: 20 },
  release: { gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
