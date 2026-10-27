import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, Text, View } from 'react-native'
import { tonePalette, type IconName } from '@/components/ui'
import type { Tone } from '@/lib/status'
import { useAppTheme } from '@/theme/theme'

/** Icon + text, so state never depends on color alone. */
export function StatusPill({ label, tone, icon }: { label: string; tone: Tone; icon: IconName }) {
  const theme = useAppTheme()
  const colors = tonePalette(theme, tone)
  return (
    <View style={[styles.pill, { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={15} color={colors.text} />
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  )
}

export function TestDataPill() {
  return <StatusPill label="Dữ liệu thử" tone="info" icon="flask-outline" />
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  text: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
})
