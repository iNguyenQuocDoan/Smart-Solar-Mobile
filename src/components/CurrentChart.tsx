import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { chartRuns, formatAmps, formatAxisTime, formatReadingTime, valueRange, type ChartPoint } from '@/lib/iot'
import { useAppTheme } from '@/theme/theme'

// Biểu đồ dòng điện theo thời gian thật, vẽ bằng View (không thêm thư viện native). Chỉ vẽ đúng các điểm backend trả, trục thời
// gian theo giờ nhận thật; hai số đo cách nhau quá `maxGapMs` thì không nối nên khoảng thiếu số đo là khoảng trống

const HEIGHT = 180
const AXIS_WIDTH = 64
const LINE = 2
const DOT = 6
/** Ít điểm thì vẽ cả chấm để thấy từng số đo */
const DOTS_UNTIL = 60

export function CurrentChart({ points, maxGapMs }: { points: ChartPoint[]; maxGapMs: number }) {
  const theme = useAppTheme()
  const [width, setWidth] = useState(0)
  if (points.length === 0) return null

  const first = points[0]!
  const last = points[points.length - 1]!
  const span = last.at - first.at
  const { min, max } = valueRange(points)
  const plotWidth = Math.max(0, width - AXIS_WIDTH)
  const x = (at: number) => (span === 0 ? plotWidth / 2 : ((at - first.at) / span) * plotWidth)
  const y = (amps: number) => ((max - amps) / (max - min)) * HEIGHT
  const runs = chartRuns(points, maxGapMs)
  const showDots = points.length <= DOTS_UNTIL

  const low = Math.min(...points.map((p) => p.currentAmps))
  const high = Math.max(...points.map((p) => p.currentAmps))
  const summary =
    `Biểu đồ dòng điện, ${points.length} số đo từ ${formatReadingTime(new Date(first.at).toISOString())} ` +
    `đến ${formatReadingTime(new Date(last.at).toISOString())}, thấp nhất ${formatAmps(low)}, cao nhất ${formatAmps(high)}`

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={styles.wrap}>
      <Text style={[styles.unit, { color: theme.textMuted }]}>Dòng điện (A)</Text>
      <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.axis, { height: HEIGHT }]}>
          <Text style={[styles.tick, { color: theme.textMuted, top: -8 }]}>{formatAmps(max)}</Text>
          {min < 0 && max > 0 ? (
            <Text style={[styles.tick, { color: theme.textMuted, top: y(0) - 8 }]}>0 A</Text>
          ) : null}
          <Text style={[styles.tick, { color: theme.textMuted, top: HEIGHT - 8 }]}>{formatAmps(min)}</Text>
        </View>
        <View style={[styles.plot, { height: HEIGHT, borderColor: theme.border }]}>
          <View style={[styles.zero, { top: y(0), backgroundColor: theme.textSubtle }]} />
          {plotWidth > 0
            ? runs.map((run) => (
                <View key={run[0]!.readingId} style={StyleSheet.absoluteFill} pointerEvents="none">
                  {run.slice(1).map((p, i) => (
                    <Segment
                      key={p.readingId}
                      x1={x(run[i]!.at)}
                      y1={y(run[i]!.currentAmps)}
                      x2={x(p.at)}
                      y2={y(p.currentAmps)}
                      color={theme.chart}
                    />
                  ))}
                  {run.length === 1 || showDots
                    ? run.map((p) => (
                        <View
                          key={`dot-${p.readingId}`}
                          style={[
                            styles.dot,
                            { left: x(p.at) - DOT / 2, top: y(p.currentAmps) - DOT / 2, backgroundColor: theme.chart },
                          ]}
                        />
                      ))
                    : null}
                </View>
              ))
            : null}
        </View>
      </View>
      <View style={[styles.times, { marginLeft: AXIS_WIDTH }]}>
        <Text style={[styles.time, { color: theme.textMuted }]}>{formatAxisTime(first.at, span)}</Text>
        {span > 0 ? (
          <Text style={[styles.time, { color: theme.textMuted }]}>{formatAxisTime(last.at, span)}</Text>
        ) : null}
      </View>
    </View>
  )
}

function Segment({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.hypot(dx, dy)
  return (
    <View
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - length / 2,
        top: (y1 + y2) / 2 - LINE / 2,
        width: length,
        height: LINE,
        backgroundColor: color,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
      }}
    />
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 6, paddingVertical: 4 },
  unit: { fontSize: 12, lineHeight: 16 },
  row: { flexDirection: 'row' },
  axis: { width: AXIS_WIDTH, position: 'relative' },
  tick: { position: 'absolute', right: 6, fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
  plot: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  zero: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { fontSize: 11, lineHeight: 16, fontVariant: ['tabular-nums'] },
})
