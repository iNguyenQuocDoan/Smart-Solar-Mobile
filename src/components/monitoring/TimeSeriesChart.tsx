import { memo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useAppTheme } from '@/theme/theme'

export type ChartPoint = { key: string; time: number; value: number | null; note?: string }

type Props = {
  /** Oldest first. */
  points: ChartPoint[]
  label: string
  axisTitle: string
  unit: string
  formatValue: (value: number) => string
  formatTick: (value: number) => string
  formatTime: (time: number) => string
  formatAxisTime: (time: number) => string
  plotHeight?: number
  dimmed?: boolean
  emptyText?: string
}

const AXIS_WIDTH = 40
const TICK_HEIGHT = 16

function niceScale(values: number[]) {
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const raw = (high - low || 1) / 3
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const ratio = raw / magnitude
  const step = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * magnitude
  const min = Math.floor(low / step) * step
  const max = Math.max(Math.ceil(high / step) * step, min + step)
  const count = Math.round((max - min) / step)
  return { min, max, ticks: Array.from({ length: count + 1 }, (_, index) => Number((min + index * step).toFixed(6))) }
}

/**
 * One column per sample, placed by receive time so gaps in reporting stay visible.
 * Samples without a value draw nothing (never 0). Touch or drag to read a sample;
 * screen readers step through samples with the adjustable actions.
 */
function TimeSeriesChartBase({
  points,
  label,
  axisTitle,
  unit,
  formatValue,
  formatTick,
  formatTime,
  formatAxisTime,
  plotHeight = 160,
  dimmed = false,
  emptyText = 'Chưa có số đo trong khoảng này.',
}: Props) {
  const theme = useAppTheme()
  const [width, setWidth] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const values = points.flatMap((point) => (point.value == null ? [] : [point.value]))

  if (values.length === 0) {
    return (
      <View style={[styles.empty, { height: plotHeight, borderColor: theme.border }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>{emptyText}</Text>
      </View>
    )
  }

  const { min, max, ticks } = niceScale(values)
  const y = (value: number) => plotHeight - ((value - min) / (max - min)) * plotHeight
  const zeroY = y(0)
  const first = points[0]!.time
  const last = points[points.length - 1]!.time
  const barWidth = Math.min(16, Math.max(1.5, width / points.length - 2))
  const usable = Math.max(width - barWidth, 0)
  const xs = points.map((point, index) => {
    if (last > first) return barWidth / 2 + ((point.time - first) / (last - first)) * usable
    return barWidth / 2 + (points.length > 1 ? (index / (points.length - 1)) * usable : usable / 2)
  })
  const radius = barWidth >= 8 ? 4 : barWidth >= 4 ? 2 : 0
  const selectedIndex = selectedKey == null ? -1 : points.findIndex((point) => point.key === selectedKey)
  const selected = selectedIndex >= 0 ? points[selectedIndex]! : null
  const readout = selected
    ? selected.value == null
      ? 'Không có số đo'
      : `${formatValue(selected.value)} ${unit}`
    : null

  function pick(x: number) {
    let best = 0
    xs.forEach((position, index) => {
      if (Math.abs(position - x) < Math.abs(xs[best]! - x)) best = index
    })
    setSelectedKey(points[best]!.key)
  }

  function step(delta: number) {
    const from = selectedIndex >= 0 ? selectedIndex : points.length
    const next = Math.min(points.length - 1, Math.max(0, from + delta))
    setSelectedKey(points[next]!.key)
  }

  return (
    <View style={dimmed && styles.dimmed}>
      <View style={styles.readout}>
        {selected ? (
          <>
            <Text style={[styles.readoutValue, { color: theme.text }]}>{readout}</Text>
            <Text style={[styles.readoutMeta, { color: theme.textMuted }]}>
              {[formatTime(selected.time), selected.note].filter(Boolean).join(' · ')}
            </Text>
          </>
        ) : (
          <Text style={[styles.hint, { color: theme.textMuted }]}>Chạm hoặc kéo trên biểu đồ để xem từng số đo.</Text>
        )}
      </View>
      <Text style={[styles.axisTitle, { color: theme.textMuted }]}>{axisTitle}</Text>
      <View style={styles.plotRow}>
        <View style={{ width: AXIS_WIDTH, height: plotHeight }}>
          {ticks.map((tick) => (
            <Text
              key={tick}
              style={[
                styles.tick,
                {
                  top: Math.min(Math.max(y(tick) - TICK_HEIGHT / 2, 0), plotHeight - TICK_HEIGHT),
                  color: theme.textMuted,
                },
              ]}
            >
              {formatTick(tick)}
            </Text>
          ))}
        </View>
        <View
          style={[styles.plot, { height: plotHeight }]}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          {ticks.map((tick) => (
            <View
              key={tick}
              style={[styles.gridLine, { top: y(tick), backgroundColor: tick === 0 ? theme.textSubtle : theme.border }]}
            />
          ))}
          {width > 0
            ? points.map((point, index) => {
                if (point.value == null) return null
                const positive = point.value >= 0
                const barHeight = Math.max(2, Math.abs(y(point.value) - zeroY))
                return (
                  <View
                    key={point.key}
                    style={{
                      position: 'absolute',
                      left: xs[index]! - barWidth / 2,
                      width: barWidth,
                      top: positive ? zeroY - barHeight : zeroY,
                      height: barHeight,
                      backgroundColor: theme.chart,
                      opacity: selected && index !== selectedIndex ? 0.35 : 1,
                      borderTopLeftRadius: positive ? radius : 0,
                      borderTopRightRadius: positive ? radius : 0,
                      borderBottomLeftRadius: positive ? 0 : radius,
                      borderBottomRightRadius: positive ? 0 : radius,
                    }}
                  />
                )
              })
            : null}
          {selected && width > 0 ? (
            <View style={[styles.crosshair, { left: xs[selectedIndex]! - 0.5, backgroundColor: theme.textMuted }]} />
          ) : null}
          <View
            style={StyleSheet.absoluteFill}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={label}
            accessibilityValue={{
              text: selected
                ? `${readout}, lúc ${formatTime(selected.time)}`
                : `${points.length} số đo. Vuốt lên hoặc xuống để nghe từng số đo.`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(event) => pick(event.nativeEvent.locationX)}
            onResponderMove={(event) => pick(event.nativeEvent.locationX)}
          />
        </View>
      </View>
      <View style={[styles.xAxis, { marginLeft: AXIS_WIDTH }]}>
        <Text style={[styles.xLabel, { color: theme.textMuted }]}>{formatAxisTime(first)}</Text>
        {points.length > 2 ? (
          <Text style={[styles.xLabel, { color: theme.textMuted }]}>{formatAxisTime((first + last) / 2)}</Text>
        ) : null}
        {points.length > 1 ? (
          <Text style={[styles.xLabel, { color: theme.textMuted }]}>{formatAxisTime(last)}</Text>
        ) : null}
      </View>
      <Text style={[styles.xTitle, { color: theme.textMuted }]}>Thời điểm nhận</Text>
    </View>
  )
}

export const TimeSeriesChart = memo(TimeSeriesChartBase)

const styles = StyleSheet.create({
  dimmed: { opacity: 0.5 },
  readout: { minHeight: 46, justifyContent: 'center', gap: 2, marginBottom: 6 },
  readoutValue: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  readoutMeta: { fontSize: 13, lineHeight: 18 },
  hint: { fontSize: 13, lineHeight: 18 },
  axisTitle: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 6 },
  plotRow: { flexDirection: 'row' },
  tick: { position: 'absolute', right: 8, fontSize: 11, lineHeight: TICK_HEIGHT, fontVariant: ['tabular-nums'] },
  plot: { flex: 1 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  crosshair: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  xLabel: { fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  xTitle: { fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 2 },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
