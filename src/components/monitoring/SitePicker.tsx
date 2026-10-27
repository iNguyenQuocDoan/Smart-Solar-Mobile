import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { OptionSheet } from '@/components/monitoring/OptionSheet'
import type { MonitoringSite } from '@/lib/monitoring/types'
import { useAppTheme } from '@/theme/theme'

/**
 * Shows the site being viewed. With more than one site it becomes a button that opens a picker.
 * `title` is the large dashboard heading; `field` is a compact selector for list screens.
 */
export function SitePicker({
  sites,
  site,
  onSelect,
  variant = 'title',
}: {
  sites: MonitoringSite[]
  site: MonitoringSite
  onSelect: (siteId: string) => void
  variant?: 'title' | 'field'
}) {
  const theme = useAppTheme()
  const [open, setOpen] = useState(false)
  const multiple = sites.length > 1

  const content =
    variant === 'title' ? (
      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            {site.name}
          </Text>
          {multiple ? (
            <View style={[styles.switch, { backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.switchText, { color: theme.text }]}>Đổi</Text>
              <Ionicons name="chevron-down" size={16} color={theme.text} />
            </View>
          ) : null}
        </View>
        {site.address ? <Text style={[styles.address, { color: theme.textMuted }]}>{site.address}</Text> : null}
      </View>
    ) : (
      <View style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="business-outline" size={20} color={theme.textMuted} />
        <View style={styles.fieldCopy}>
          <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Công trình</Text>
          <Text numberOfLines={2} style={[styles.fieldValue, { color: theme.text }]}>
            {site.name}
          </Text>
        </View>
        {multiple ? (
          <>
            <Text style={[styles.switchText, { color: theme.brandText }]}>Đổi</Text>
            <Ionicons name="chevron-down" size={18} color={theme.brandText} />
          </>
        ) : null}
      </View>
    )

  if (!multiple) return content

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Đổi công trình. Đang xem ${site.name}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.7 }]}
      >
        {content}
      </Pressable>
      <OptionSheet
        visible={open}
        title="Chọn công trình"
        sections={[
          {
            selected: site.siteId,
            onSelect,
            options: sites.map((item) => ({
              value: item.siteId,
              label: item.name,
              description: [item.address, `${item.devices.length} thiết bị`].filter(Boolean).join(' · '),
            })),
          },
        ]}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 6 },
  titleBlock: { gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  title: { flexShrink: 1, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  switch: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  switchText: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  address: { fontSize: 14, lineHeight: 20 },
  field: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldCopy: { flex: 1, gap: 1 },
  fieldLabel: { fontSize: 12, lineHeight: 16 },
  fieldValue: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
})
