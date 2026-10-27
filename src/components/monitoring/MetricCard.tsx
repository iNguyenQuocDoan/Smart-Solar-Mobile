import Ionicons from '@expo/vector-icons/Ionicons'
import { Fragment, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Panel } from '@/components/ui'
import { useAppTheme } from '@/theme/theme'

/** The one headline figure of a view. Last-known values render muted with a qualifier, never as live. */
export function MetricCard({
  label,
  qualifier,
  value,
  unit,
  unitSpoken,
  formatValue,
  emptyText,
  caption,
  current,
  pills,
  notes = [],
}: {
  label: string
  qualifier?: string
  value: number | null
  unit: string
  unitSpoken: string
  formatValue: (value: number) => string
  emptyText: string
  caption: string | null
  current: boolean
  pills?: ReactNode
  notes?: string[]
}) {
  const theme = useAppTheme()
  const title = qualifier ? `${label} · ${qualifier}` : label
  return (
    <Panel style={styles.card}>
      {pills ? <View style={styles.pills}>{pills}</View> : null}
      <View style={styles.figure}>
        <Text style={[styles.label, { color: theme.textMuted }]}>{title}</Text>
        {value != null ? (
          <Text
            accessibilityLabel={`${title}: ${formatValue(value)} ${unitSpoken}`}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={styles.valueLine}
          >
            <Text style={[styles.value, { color: current ? theme.text : theme.textMuted }]}>{formatValue(value)}</Text>
            <Text style={[styles.unit, { color: theme.textMuted }]}> {unit}</Text>
          </Text>
        ) : (
          <Text style={[styles.empty, { color: theme.text }]}>{emptyText}</Text>
        )}
        {caption ? <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text> : null}
      </View>
      {notes.map((note) => (
        <View key={note} style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.noteText, { color: theme.text }]}>{note}</Text>
        </View>
      ))}
    </Panel>
  )
}

/** Secondary figures in one row. Values keep their unit inside the same line so it is never dropped. */
export function MetricStrip({ items, caption }: { items: { label: string; value: string }[]; caption?: string }) {
  const theme = useAppTheme()
  return (
    <View style={styles.stripWrap}>
      <Panel style={styles.strip}>
        {items.map((item, index) => (
          <Fragment key={item.label}>
            {index > 0 ? <View style={[styles.rule, { backgroundColor: theme.border }]} /> : null}
            <View style={styles.cell} accessible accessibilityLabel={`${item.label}: ${item.value}`}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[styles.cellValue, { color: theme.text }]}
              >
                {item.value}
              </Text>
              <Text style={[styles.cellLabel, { color: theme.textMuted }]}>{item.label}</Text>
            </View>
          </Fragment>
        ))}
      </Panel>
      {caption ? <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  figure: { gap: 2 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  valueLine: { marginTop: 2 },
  value: { fontSize: 52, lineHeight: 62, fontWeight: '700', letterSpacing: -1 },
  unit: { fontSize: 24, lineHeight: 30, fontWeight: '600' },
  empty: { fontSize: 20, lineHeight: 28, fontWeight: '700', marginVertical: 6 },
  caption: { fontSize: 13, lineHeight: 18 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontSize: 14, lineHeight: 20 },
  stripWrap: { gap: 8 },
  strip: { flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingVertical: 14 },
  rule: { width: StyleSheet.hairlineWidth },
  cell: { flex: 1, minWidth: 0, gap: 2 },
  cellValue: { fontSize: 19, lineHeight: 25, fontWeight: '700' },
  cellLabel: { fontSize: 13, lineHeight: 18 },
})
