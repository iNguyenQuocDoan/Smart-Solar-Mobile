import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAppTheme } from '@/theme/theme'

/** The one headline figure of a view. Last-known values render muted with a qualifier, never as live. */
export function MetricFigure({
  label,
  qualifier,
  value,
  unit,
  unitSpoken,
  formatValue,
  emptyText,
  caption,
  current,
  status,
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
  status?: ReactNode
  notes?: string[]
}) {
  const theme = useAppTheme()
  const title = qualifier ? `${label}, ${qualifier}` : label
  return (
    <View style={styles.figure}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{title}</Text>
      {value != null ? (
        <Text
          accessibilityLabel={`${title}: ${formatValue(value)} ${unitSpoken}`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          <Text style={[styles.value, { color: current ? theme.text : theme.textMuted }]}>{formatValue(value)}</Text>
          <Text style={[styles.unit, { color: theme.textMuted }]}> {unit}</Text>
        </Text>
      ) : (
        <Text style={[styles.empty, { color: theme.text }]}>{emptyText}</Text>
      )}
      {status ? <View style={styles.status}>{status}</View> : null}
      {caption ? <Text style={[styles.small, { color: theme.textMuted }]}>{caption}</Text> : null}
      {notes.map((note) => (
        <Text key={note} style={[styles.small, { color: theme.text }]}>
          {note}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  figure: { gap: 1 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  value: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
  unit: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  empty: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  status: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  small: { fontSize: 13, lineHeight: 18 },
})
