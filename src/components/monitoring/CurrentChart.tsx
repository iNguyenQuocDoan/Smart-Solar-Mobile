import { memo, useMemo } from 'react'
import { TimeSeriesChart } from '@/components/monitoring/TimeSeriesChart'
import { formatAmpere, formatAxisNumber, formatClock, timeAxisFormatter } from '@/lib/monitoring/format'
import type { DeviceReading } from '@/lib/monitoring/types'

/** Current (A) over time from readings given newest first, as the IoT API returns them. */
function CurrentChartBase({
  readings,
  plotHeight,
  dimmed,
}: {
  readings: DeviceReading[]
  plotHeight?: number
  dimmed?: boolean
}) {
  const points = useMemo(
    () =>
      [...readings].reverse().map((reading) => ({
        key: String(reading.id),
        time: new Date(reading.receivedAtUtc).getTime(),
        value: reading.currentA,
        note: reading.isTest ? 'Dữ liệu thử' : undefined,
      })),
    [readings],
  )
  const formatAxisTime = useMemo(
    () => timeAxisFormatter(points[0]?.time ?? 0, points[points.length - 1]?.time ?? 0),
    [points],
  )
  return (
    <TimeSeriesChart
      points={points}
      label="Biểu đồ dòng điện theo thời gian"
      axisTitle="Dòng điện (A)"
      unit="A"
      formatValue={formatAmpere}
      formatTick={formatAxisNumber}
      formatTime={formatClock}
      formatAxisTime={formatAxisTime}
      plotHeight={plotHeight}
      dimmed={dimmed}
      emptyText="Chưa có số đo dòng điện trong khoảng này."
    />
  )
}

export const CurrentChart = memo(CurrentChartBase)
