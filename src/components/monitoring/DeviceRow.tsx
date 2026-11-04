import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'
import { ListRow, StatusText } from '@/components/ui'
import { formatCurrent, formatReceivedAt, formatRelative } from '@/lib/monitoring/format'
import { deviceStatusView } from '@/lib/monitoring/status'
import type { MonitoringDevice } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

export function DeviceRow({
  device,
  now,
  refreshFailed,
  last = false,
  onPress,
}: {
  device: MonitoringDevice
  now: number
  refreshFailed: boolean
  last?: boolean
  onPress: () => void
}) {
  const theme = useAppTheme()
  const status = deviceStatusView(device, refreshFailed)
  const reading = device.lastReading
  return (
    <ListRow
      accessibilityLabel={`${device.name}, ${status.label}${reading ? `, ${formatCurrent(reading.currentA)}` : ''}`}
      accessibilityHint="Mở chi tiết thiết bị"
      onPress={onPress}
      last={last}
    >
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>
          {device.name}
        </Text>
        <Text style={[styles.meta, { color: theme.textMuted }]}>Mã {device.deviceId}</Text>
        <View style={styles.status}>
          <StatusText tone={status.tone}>{status.label}</StatusText>
          {reading?.isTest ? <StatusText tone="info">Dữ liệu thử</StatusText> : null}
        </View>
        {reading ? (
          <Text style={[styles.meta, { color: theme.text }]}>
            {status.current ? 'Dòng điện' : 'Số đo cuối'} {formatCurrent(reading.currentA)}, nhận lúc{' '}
            {formatReceivedAt(reading.receivedAtUtc, now)}, {formatRelative(reading.receivedAtUtc, now)}
          </Text>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>Chưa nhận được số đo nào</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSubtle} />
    </ListRow>
  )
}

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 1 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  status: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { fontSize: 13, lineHeight: 18 },
})
