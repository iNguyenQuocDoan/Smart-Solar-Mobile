import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter, type Href } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { TechnicianAppointment } from '@/lib/api/types'
import { appointmentStatus } from '@/lib/status'
import { formatShortDate, formatTimeRange, dateOf } from '@/lib/format'
import { Badge } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export function TechJobRow({ job, last = false }: { job: TechnicianAppointment; last?: boolean }) {
  const theme = useAppTheme()
  const router = useRouter()
  const status = appointmentStatus(job.status, 'technician')
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem việc ${job.propertyName}`}
      onPress={() => router.push({ pathname: '/tech/job/[id]', params: { id: job.appointmentId } } as Href)}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderBottomColor: theme.border }, last && styles.last]}
    >
      <View style={styles.timeBlock}>
        <Text style={[styles.time, { color: theme.text }]}>{formatTimeRange(job.startsAt, job.endsAt)}</Text>
        <Text style={[styles.day, { color: theme.textMuted }]}>{formatShortDate(dateOf(job.startsAt))}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{job.propertyName}</Text>
        <Text style={[styles.address, { color: theme.textMuted }]} numberOfLines={1}>{[job.district, job.province].filter(Boolean).join(', ')}</Text>
        <Badge tone={status.tone}>{status.label}</Badge>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: 116, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  last: { borderBottomWidth: 0 },
  timeBlock: { width: 78, alignSelf: 'flex-start', gap: 3 },
  time: { fontSize: 15, lineHeight: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  day: { fontSize: 12, lineHeight: 17, textTransform: 'capitalize' },
  copy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  name: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  address: { fontSize: 13, lineHeight: 18 },
})
