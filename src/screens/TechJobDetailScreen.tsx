import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { useAcknowledgeJob, useTechJob } from '@/hooks/queries'
import { appointmentStatus } from '@/lib/status'
import { formatAppointment, formatDistance, formatDuration, shortCode } from '@/lib/format'
import { Badge, Button, IconButton, KeyValue, PageHeader, Panel, QueryState, Screen, SectionTitle } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const n = (value: number | null | undefined) => value == null ? '—' : number.format(value)

export function TechJobDetailScreen() {
  const theme = useAppTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const query = useTechJob(id ?? '')
  const acknowledge = useAcknowledgeJob(id ?? '')
  const [message, setMessage] = useState('')
  const job = query.data

  async function accept() {
    setMessage('')
    try {
      const result = await acknowledge.mutateAsync()
      setMessage(result.alreadyAcknowledged ? 'Bạn đã nhận việc này trước đó.' : 'Đã nhận việc. Khách hàng và kinh doanh sẽ thấy xác nhận này.')
    } catch {
      // Mutation error is shown in the action panel.
    }
  }

  function openMap() {
    if (!job || job.property.latitude == null || job.property.longitude == null) return
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${job.property.latitude},${job.property.longitude}`)
  }

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => void query.refetch()}>
      <View style={styles.back}><IconButton label="Quay lại" icon="arrow-back" onPress={() => router.back()} /></View>
      <QueryState loading={query.isPending} error={query.error} onRetry={() => void query.refetch()} />
      {job ? (
        <>
          <View style={styles.metaRow}>
            <Badge tone={appointmentStatus(job.status, 'technician').tone}>{appointmentStatus(job.status, 'technician').label}</Badge>
            <Text style={[styles.code, { color: theme.textMuted }]}>Mã {shortCode(job.surveyRequestId)}</Text>
          </View>
          <PageHeader title={job.property.name} description={formatAppointment(job.startsAt, job.endsAt)} />
          {job.status === 'ASSIGNED' ? (
            <Panel style={{ borderColor: theme.danger }}>
              <SectionTitle detail="Xem địa chỉ và số liệu trước khi xác nhận.">Xác nhận nhận việc</SectionTitle>
              <Button label="Nhận việc" onPress={() => void accept()} loading={acknowledge.isPending} />
              {message ? <Text style={[styles.success, { color: theme.success }]}>{message}</Text> : null}
              {acknowledge.error ? <Text style={[styles.error, { color: theme.danger }]}>{acknowledge.error.message}</Text> : null}
            </Panel>
          ) : null}
          {job.status === 'ACKNOWLEDGED' ? (
            <View style={[styles.notice, { backgroundColor: theme.successSoft }]}>
              <Text style={[styles.noticeText, { color: theme.success }]}>Bạn đã nhận việc. Hãy tới công trình đúng giờ hẹn.</Text>
            </View>
          ) : null}
          <Panel>
            <SectionTitle>Đường tới công trình</SectionTitle>
            <View style={styles.travelRow}>
              <KeyValue label="Quãng đường" value={formatDistance(job.inboundTravelEstimate?.distanceMeters)} />
              <KeyValue label="Thời gian" value={formatDuration(job.inboundTravelEstimate?.durationSeconds)} />
            </View>
            {job.property.latitude != null && job.property.longitude != null ? <Button label="Mở bản đồ" icon="map-outline" variant="secondary" onPress={openMap} /> : null}
          </Panel>
          <Panel>
            <SectionTitle>Công trình</SectionTitle>
            <KeyValue label="Địa chỉ" value={[job.property.streetLine, job.property.ward, job.property.district, job.property.province].filter(Boolean).join(', ') || '—'} />
            <KeyValue label="Bề mặt" value={job.property.installationSurfaceType || '—'} />
            <KeyValue label="Vật liệu" value={job.property.surfaceMaterial || '—'} />
          </Panel>
          <Panel>
            <SectionTitle detail="Đo lại tại công trình để đối chiếu.">Số liệu khách khai</SectionTitle>
            <View style={styles.travelRow}>
              <KeyValue label="Rộng × dài" value={job.preSurvey.surfaceWidthM == null ? '—' : `${n(job.preSurvey.surfaceWidthM)} × ${n(job.preSurvey.surfaceLengthM)} m`} />
              <KeyValue label="Dùng được / tổng" value={`${n(job.preSurvey.usableAreaM2)} / ${n(job.preSurvey.totalAreaM2)} m²`} />
            </View>
            <KeyValue label="Độ dốc" value={job.preSurvey.surfaceTiltDegree == null ? '—' : `${n(job.preSurvey.surfaceTiltDegree)}°`} />
            <KeyValue label="Vật cản" value={job.preSurvey.obstacleCount > 0 ? `${job.preSurvey.obstacleCount} vật cản` : job.preSurvey.hasObstruction ? 'Có' : 'Không'} />
          </Panel>
          <Panel>
            <SectionTitle>Khách hàng</SectionTitle>
            <KeyValue label="Họ tên" value={job.customer.fullName || '—'} />
            <KeyValue label="Điện thoại" value={job.customer.phone || '—'} />
            <KeyValue label="Email" value={job.customer.email || '—'} />
            {job.customer.phone ? <Button label="Gọi khách" icon="call-outline" variant="secondary" onPress={() => void Linking.openURL(`tel:${job.customer.phone}`)} /> : null}
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
  success: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  notice: { padding: 14, borderRadius: 6 },
  noticeText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  travelRow: { flexDirection: 'row', gap: 28, flexWrap: 'wrap' },
})
