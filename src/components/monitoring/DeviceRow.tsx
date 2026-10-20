import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusPill, TestDataPill } from '@/components/monitoring/StatusPill'
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${status.label}${reading ? `, ${formatCurrent(reading.currentA)}` : ''}`}
      accessibilityHint="Mở chi tiết thiết bị"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderBottomColor: theme.border },
        last && styles.last,
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.surfaceMuted }]}>
        <Ionicons name="hardware-chip-outline" size={22} color={theme.textMuted} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.name, { color: theme.text }]}>{device.name}</Text>
        <Text style={[styles.code, { color: theme.textMuted }]}>Mã {device.deviceId}</Text>
        <View style={styles.pills}>
          <StatusPill label={status.label} tone={status.tone} icon={status.icon} />
          {reading?.isTest ? <TestDataPill /> : null}
        </View>
        {reading ? (
          <>
            <Text style={[styles.meta, { color: theme.text }]}>
              {status.current ? 'Dòng điện' : 'Số đo cuối'}: {formatCurrent(reading.currentA)}
            </Text>
            <Text style={[styles.meta, { color: theme.textMuted }]}>
              Nhận lúc {formatReceivedAt(reading.receivedAtUtc, now)} · {formatRelative(reading.receivedAtUtc, now)}
            </Text>
          </>
        ) : (
          <Text style={[styles.meta, { color: theme.textMuted }]}>Chưa nhận được số đo nào</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  last: { borderBottomWidth: 0 },
  iconBox: { width: 40, height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  copy: { flex: 1, gap: 5 },
  name: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  code: { fontSize: 12, lineHeight: 17 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 2 },
  meta: { fontSize: 14, lineHeight: 20 },
})
