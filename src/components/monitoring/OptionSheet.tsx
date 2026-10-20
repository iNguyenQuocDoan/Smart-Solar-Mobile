import Ionicons from '@expo/vector-icons/Ionicons'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconButton } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

export type SheetOption = { value: string; label: string; description?: string }
export type SheetSection = { title?: string; options: SheetOption[]; selected: string; onSelect: (value: string) => void }

/** Bottom sheet with one or more single-choice groups. Choosing an option closes it. */
export function OptionSheet({ visible, title, sections, onClose }: { visible: boolean; title: string; sections: SheetSection[]; onClose: () => void }) {
  const theme = useAppTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={[StyleSheet.absoluteFill, styles.backdrop]} />
        <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
            <IconButton label="Đóng" icon="close" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {sections.map((section, sectionIndex) => (
              <View key={section.title ?? sectionIndex} style={styles.section} accessibilityRole="radiogroup" accessibilityLabel={section.title}>
                {section.title ? <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{section.title}</Text> : null}
                {section.options.map((option) => {
                  const active = option.value === section.selected
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={option.description ? `${option.label}. ${option.description}` : option.label}
                      onPress={() => {
                        section.onSelect(option.value)
                        onClose()
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          borderColor: active ? theme.brand : theme.border,
                          backgroundColor: active ? theme.brandSoft : pressed ? theme.surfacePressed : theme.surface,
                        },
                      ]}
                    >
                      <View style={styles.optionCopy}>
                        <Text style={[styles.optionLabel, { color: active ? theme.brandText : theme.text }]}>{option.label}</Text>
                        {option.description ? <Text style={[styles.optionDescription, { color: theme.textMuted }]}>{option.description}</Text> : null}
                      </View>
                      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? theme.brandText : theme.textSubtle} />
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, paddingRight: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  content: { padding: 16, gap: 20 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  option: { minHeight: 52, borderWidth: 1, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionCopy: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  optionDescription: { fontSize: 13, lineHeight: 18 },
})
