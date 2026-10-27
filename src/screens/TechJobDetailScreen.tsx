import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Linking, StyleSheet, Text, View } from 'react-native'
import { useReleaseJob, useTechJob } from '@/hooks/queries'
import type { TechnicianJob } from '@/lib/api/types'
import { appointmentStatus, assignmentSourceLabel, surfaceLabel } from '@/lib/status'
import { formatAppointment, formatMoment, shortCode } from '@/lib/format'
import {
  Badge,
  Button,
  Field,
  IconButton,
  KeyValue,
  PageHeader,
  Panel,
  QueryState,
  Screen,
  SectionTitle,
} from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (value: number | null | undefined) => (value == null ? '—' : number.format(value))

function nextStep(job: TechnicianJob, now: number) {
  if (job.status === 'COMPLETED') return 'Buổi khảo sát này đã xong.'
  if (job.status === 'CANCELLED') return 'Lịch này đã huỷ.'
  if (new Date(job.endsAt).getTime() < now)
    return 'Đã qua giờ hẹn. Nếu chưa khảo sát được, báo bộ phận kinh doanh để đổi giờ.'
  return 'Tới công trình đúng giờ hẹn. Gọi khách trước khi đi và mang theo số liệu khách khai bên dưới.'
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
    return <Button label="Trả lại việc" icon="arrow-undo-outline" variant="secondary" onPress={() => setOpen(true)} />
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

  // Tìm theo địa chỉ: toạ độ lưu kèm địa điểm chỉ là điểm giữa khu vực, không dùng để chỉ đường
  function openMap() {
    if (!job) return
    const p = job.property
    const address = [p.streetLine, p.ward, p.district, p.province].filter(Boolean).join(', ')
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
  }

  const status = job ? appointmentStatus(job.status, 'technician') : null
  const canRelease = job
    ? (job.status === 'ACCEPTED' || job.status === 'ASSIGNED') && new Date(job.startsAt).getTime() > now
    : false
  const how = job?.assignmentSource ? assignmentSourceLabel(job.assignmentSource) : 'Nhận'

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={styles.back}>
        <IconButton label="Quay lại" icon="arrow-back" onPress={() => router.back()} />
      </View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {job && status ? (
        <>
          <View style={styles.metaRow}>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Text style={[styles.code, { color: theme.textMuted }]}>Mã {shortCode(job.surveyRequestId)}</Text>
          </View>
          <PageHeader title={job.property.name} description={formatAppointment(job.startsAt, job.endsAt)} />
          <Panel>
            <SectionTitle detail={`${how} lúc ${formatMoment(job.acceptedAt ?? job.assignedAt)}.`}>
              Tình hình
            </SectionTitle>
            <Text style={[styles.body, { color: theme.text }]}>{nextStep(job, now)}</Text>
            {canRelease ? <ReleaseAction id={job.appointmentId} /> : null}
          </Panel>
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
            <KeyValue label="Vật liệu" value={job.property.surfaceMaterial || '—'} />
            <Button label="Mở bản đồ" icon="map-outline" variant="secondary" onPress={openMap} />
          </Panel>
          <Panel>
            <SectionTitle detail="Đo lại tại công trình để đối chiếu.">Số liệu khách khai</SectionTitle>
            <View style={styles.pairRow}>
              <KeyValue
                label="Rộng × dài"
                value={
                  job.preSurvey.surfaceWidthM == null
                    ? '—'
                    : `${n(job.preSurvey.surfaceWidthM)} × ${n(job.preSurvey.surfaceLengthM)} m`
                }
              />
              <KeyValue
                label="Dùng được / tổng"
                value={`${n(job.preSurvey.usableAreaM2)} / ${n(job.preSurvey.totalAreaM2)} m²`}
              />
            </View>
            <KeyValue
              label="Độ dốc"
              value={job.preSurvey.surfaceTiltDegree == null ? '—' : `${n(job.preSurvey.surfaceTiltDegree)}°`}
            />
            <KeyValue
              label="Vật cản"
              value={
                job.preSurvey.obstacleCount > 0
                  ? `${job.preSurvey.obstacleCount} vật cản`
                  : job.preSurvey.hasObstruction
                    ? 'Có'
                    : 'Không'
              }
            />
          </Panel>
          <Panel>
            <SectionTitle>Khách hàng</SectionTitle>
            <KeyValue label="Họ tên" value={job.customer.fullName || '—'} />
            <KeyValue label="Điện thoại" value={job.customer.phone || '—'} />
            <KeyValue label="Email" value={job.customer.email || '—'} />
            {job.customer.phone ? (
              <Button
                label="Gọi khách"
                icon="call-outline"
                variant="secondary"
                onPress={() => void Linking.openURL(`tel:${job.customer.phone}`)}
              />
            ) : null}
            <KeyValue label="Ghi chú" value={job.customerNote || 'Không có ghi chú.'} />
          </Panel>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { marginLeft: -8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  code: { fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] },
  body: { fontSize: 15, lineHeight: 22 },
  release: { gap: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pairRow: { flexDirection: 'row', gap: 28, flexWrap: 'wrap' },
})
