import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import type { TechnicianAppointment } from '@/lib/api/types'
import { appointmentStatus } from '@/lib/status'
import { formatShortDate, formatTimeRange, dateOf } from '@/lib/format'
import { ListRow, StatusText } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function TechJobRow({ job, last = false }: { job: TechnicianAppointment; last?: boolean }) {
  const theme = useAppTheme()
  const router = useRouter()
  const status = appointmentStatus(job.status, 'technician')
  return (
    <ListRow
      accessibilityLabel={`Xem việc ${job.propertyName}`}
      onPress={() => router.push({ pathname: '/tech/job/[id]', params: { id: job.appointmentId } } as Href)}
      last={last}
    >
      <View style={styles.timeBlock}>
        <Text style={[styles.time, { color: theme.text }]}>{formatTimeRange(job.startsAt, job.endsAt)}</Text>
        <Text style={[styles.day, { color: theme.textMuted }]}>{formatShortDate(dateOf(job.startsAt))}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {job.propertyName}
        </Text>
        <Text style={[styles.address, { color: theme.textMuted }]} numberOfLines={1}>
          {[job.communeName ?? job.ward ?? job.district, job.province].filter(Boolean).join(', ')}
        </Text>
        {job.isOverdue ? (
          <StatusText tone="danger">Quá giờ, chưa khảo sát</StatusText>
        ) : (
          <StatusText tone={status.tone}>{status.label}</StatusText>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
    </ListRow>
  )
}

const styles = StyleSheet.create({
  timeBlock: { flexShrink: 0, alignSelf: 'flex-start', gap: 1 },
  time: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  day: { fontSize: 12, lineHeight: 16, textTransform: 'capitalize' },
  copy: { flex: 1, gap: 1 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  address: { fontSize: 13, lineHeight: 18 },
})
