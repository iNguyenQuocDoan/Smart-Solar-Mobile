import { StyleSheet, Text, View } from 'react-native'
import { ListRow } from '@/components/ui'
import { formatAmpere, formatClock, formatCurrent, formatDayMonth } from '@/lib/monitoring/format'
import type { DeviceReading } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

/** Table twin of the chart: every sample, newest first. */
export function ReadingList({ readings }: { readings: DeviceReading[] }) {
  const theme = useAppTheme()
  return (
    <View>
      <View style={[styles.head, { borderBottomColor: theme.border }]}>
        <Text style={[styles.small, { color: theme.textMuted }]}>Thời điểm nhận</Text>
        <Text style={[styles.small, { color: theme.textMuted }]}>Dòng điện</Text>
      </View>
      {readings.map((reading, index) => (
        <ListRow
          key={reading.id}
          accessibilityLabel={`${formatClock(reading.receivedAtUtc)} ngày ${formatDayMonth(reading.receivedAtUtc)}: ${formatCurrent(reading.currentA)}${reading.isTest ? ', dữ liệu thử' : ''}`}
          last={index === readings.length - 1}
          style={styles.row}
        >
          <Text style={[styles.time, { color: theme.text }]}>
            {formatClock(reading.receivedAtUtc)}{' '}
            <Text style={[styles.small, { color: theme.textMuted }]}>{formatDayMonth(reading.receivedAtUtc)}</Text>
          </Text>
          <View style={styles.what}>
            {reading.currentA != null ? (
              <Text style={[styles.value, { color: theme.text }]}>{formatAmpere(reading.currentA)} A</Text>
            ) : (
              <Text style={[styles.small, { color: theme.textMuted }]}>Không có số đo</Text>
            )}
            {reading.isTest ? <Text style={[styles.small, { color: theme.info }]}>Dữ liệu thử</Text> : null}
          </View>
        </ListRow>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { justifyContent: 'space-between', paddingVertical: 6 },
  what: { alignItems: 'flex-end', flexShrink: 1 },
  time: { fontSize: 14, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  value: { fontSize: 14, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  small: { fontSize: 12, lineHeight: 16, fontWeight: '400', fontVariant: ['tabular-nums'] },
})
