import { useRouter, type Href } from 'expo-router'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Button, ListRow } from '@/components/ui'
import { useAcceptJob } from '@/hooks/queries'
import type { OpenAppointment } from '@/lib/api/types'
import { dateOf, formatArea, formatMoment, formatShortDate, formatTimeRange } from '@/lib/format'
import { ineligibleLabel, surfaceLabel } from '@/lib/status'
import { useAppTheme } from '@/theme/theme'

// Lịch khách đặt trong khu vực đang chờ người nhận, ai nhận trước thì được. Nhận xong mới thấy địa chỉ và số khách
export function TechOpenJobRow({ job, last = false }: { job: OpenAppointment; last?: boolean }) {
  const theme = useAppTheme()
  const router = useRouter()
  const accept = useAcceptJob()

  async function onAccept() {
    try {
      await accept.mutateAsync({ id: job.appointmentId, revision: job.revision })
      router.push({ pathname: '/tech/job/[id]', params: { id: job.appointmentId } } as Href)
    } catch (error) {
      // Người khác nhận trước thì danh sách tự tải lại và dòng này biến mất, nên báo bằng hộp thoại
      Alert.alert('Chưa nhận được lịch', error instanceof Error ? error.message : 'Vui lòng thử lại.')
    }
  }

  return (
    <ListRow last={last} style={styles.row}>
      <View style={styles.timeBlock}>
        <Text style={[styles.time, { color: theme.text }]}>{formatTimeRange(job.startsAt, job.endsAt)}</Text>
        <Text style={[styles.day, { color: theme.textMuted }]}>{formatShortDate(dateOf(job.startsAt))}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {job.propertyName}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
          {[job.ward, job.province].filter(Boolean).join(', ')}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>
          {surfaceLabel(job.installationSurfaceType)}, dùng được {formatArea(job.usableAreaM2)}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>Hạn nhận {formatMoment(job.acceptanceDeadlineAt)}</Text>
        {job.canAccept ? (
          <Button
            label="Nhận việc"
            icon="checkmark-circle-outline"
            compact
            loading={accept.isPending}
            onPress={() => void onAccept()}
          />
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>Chưa nhận được: {ineligibleLabel(job.reason)}</Text>
        )}
      </View>
    </ListRow>
  )
}

const styles = StyleSheet.create({
  row: { alignItems: 'flex-start' },
  timeBlock: { flexShrink: 0, gap: 1 },
  time: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  day: { fontSize: 12, lineHeight: 16 },
  copy: { flex: 1, alignItems: 'flex-start', gap: 1 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18 },
})
