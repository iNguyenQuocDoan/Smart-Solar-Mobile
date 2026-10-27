import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { IconName } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export type Shortcut = { icon: IconName; title: string; detail: string; onPress: () => void }

export function ShortcutList({ items }: { items: Shortcut[] }) {
  const theme = useAppTheme()
  return (
    <View style={[styles.list, { borderColor: theme.border }]}>
      {items.map((item, index) => (
        <Pressable
          key={item.title}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.detail}`}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: pressed ? theme.surfacePressed : theme.surface, borderBottomColor: theme.border },
            index === items.length - 1 && styles.last,
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: theme.brandSoft }]}>
            <Ionicons name={item.icon} size={20} color={theme.brandText} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
            <Text style={[styles.detail, { color: theme.textMuted }]}>{item.detail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSubtle} />
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  row: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  last: { borderBottomWidth: 0 },
  iconBox: { width: 40, height: 40, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  detail: { fontSize: 14, lineHeight: 20 },
})
