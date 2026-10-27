import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import type { MonitoringDevice } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

/** Device chips for sites with more than one device; renders nothing otherwise. */
export function DeviceSwitcher({
  devices,
  selectedId,
  onSelect,
}: {
  devices: MonitoringDevice[]
  selectedId: string
  onSelect: (deviceId: string) => void
}) {
  const theme = useAppTheme()
  if (devices.length < 2) return null
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroller}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Chọn thiết bị"
    >
      {devices.map((device) => {
        const active = device.deviceId === selectedId
        return (
          <Pressable
            key={device.deviceId}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={device.name}
            onPress={() => onSelect(device.deviceId)}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: active ? theme.brand : theme.border,
                backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface,
              },
            ]}
          >
            <Ionicons
              name={active ? 'checkmark' : 'hardware-chip-outline'}
              size={16}
              color={active ? theme.brandText : theme.textMuted}
            />
            <Text numberOfLines={1} style={[styles.label, { color: active ? theme.brandText : theme.text }]}>
              {device.name}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroller: { marginHorizontal: -16, flexGrow: 0 },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: {
    minHeight: 44,
    maxWidth: 260,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: { flexShrink: 1, fontSize: 14, lineHeight: 19, fontWeight: '700' },
})
