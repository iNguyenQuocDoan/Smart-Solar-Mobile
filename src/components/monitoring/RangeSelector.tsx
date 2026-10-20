import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { HistoryWindow } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

/** Window picker. Unsupported windows stay visible but locked, and explain why when tapped. */
export function RangeSelector({ windows, selectedId, onSelect }: { windows: HistoryWindow[]; selectedId: string; onSelect: (id: string) => void }) {
  const theme = useAppTheme()
  const [notice, setNotice] = useState<string | null>(null)
  const groups = [...new Set(windows.map((window) => window.group))]
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Khoảng dữ liệu">
      {groups.map((group) => (
        <View key={group} style={styles.group}>
          <Text style={[styles.groupLabel, { color: theme.textMuted }]}>{group}</Text>
          <View style={styles.row}>
            {windows
              .filter((window) => window.group === group)
              .map((window) => {
                const active = window.supported && window.id === selectedId
                return (
                  <Pressable
                    key={window.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${group}: ${window.label}${window.supported ? '' : ', chưa hỗ trợ'}`}
                    onPress={() => {
                      if (window.supported) {
                        setNotice(null)
                        onSelect(window.id)
                      } else {
                        setNotice(window.reason)
                      }
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        borderColor: active ? theme.brand : theme.border,
                        backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : window.supported ? theme.surface : theme.surfaceMuted,
                      },
                    ]}
                  >
                    {active ? <Ionicons name="checkmark" size={16} color={theme.brandText} /> : null}
                    {!window.supported ? <Ionicons name="lock-closed-outline" size={14} color={theme.textMuted} /> : null}
                    <Text style={[styles.label, { color: active ? theme.brandText : window.supported ? theme.text : theme.textMuted }]}>{window.label}</Text>
                  </Pressable>
                )
              })}
          </View>
        </View>
      ))}
      {notice ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.notice, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.noticeText, { color: theme.text }]}>{notice}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  group: { gap: 6 },
  groupLabel: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, minWidth: 56, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  notice: { borderRadius: 6, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
})
