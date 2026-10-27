import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'
import { formatAmpere, formatClock, formatCurrent, formatDayMonth } from '@/lib/monitoring/format'
import type { DeviceReading } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

/** Table twin of the chart: every sample, newest first. */
export function ReadingList({ readings }: { readings: DeviceReading[] }) {
  const theme = useAppTheme()
  return (
    <View style={[styles.list, { borderColor: theme.border }]}>
      <View style={[styles.head, { backgroundColor: theme.surfaceMuted, borderBottomColor: theme.border }]}>
        <Text style={[styles.headText, { color: theme.textMuted }]}>Thời điểm nhận</Text>
        <Text style={[styles.headText, { color: theme.textMuted }]}>Dòng điện</Text>
      </View>
      {readings.map((reading, index) => (
        <View
          key={reading.id}
          accessible
          accessibilityLabel={`${formatClock(reading.receivedAtUtc)} ngày ${formatDayMonth(reading.receivedAtUtc)}: ${formatCurrent(reading.currentA)}${reading.isTest ? ', dữ liệu thử' : ''}`}
          style={[
            styles.row,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
            index === readings.length - 1 && styles.last,
          ]}
        >
          <View style={styles.when}>
            <Text style={[styles.time, { color: theme.text }]}>{formatClock(reading.receivedAtUtc)}</Text>
            <Text style={[styles.small, { color: theme.textMuted }]}>{formatDayMonth(reading.receivedAtUtc)}</Text>
          </View>
          <View style={styles.what}>
            {reading.currentA != null ? (
              <Text style={[styles.value, { color: theme.text }]}>{formatAmpere(reading.currentA)} A</Text>
            ) : (
              <Text style={[styles.missing, { color: theme.textMuted }]}>Không có số đo</Text>
            )}
            {reading.isTest ? (
              <View style={styles.tag}>
                <Ionicons name="flask-outline" size={13} color={theme.info} />
                <Text style={[styles.small, { color: theme.info }]}>Dữ liệu thử</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  when: { gap: 1 },
  what: { alignItems: 'flex-end', gap: 2, flexShrink: 1 },
  time: { fontSize: 15, lineHeight: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  value: { fontSize: 15, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] },
  missing: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  small: { fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
