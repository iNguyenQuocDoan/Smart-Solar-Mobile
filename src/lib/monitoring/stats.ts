import type { DeviceReading } from '@/lib/monitoring/types'

/** Summary of `currentA` only. Missing values are counted, never treated as 0. */
export function summarizeCurrent(readings: DeviceReading[]) {
  const values = readings.map((reading) => reading.currentA).filter((value): value is number => value != null)
  const times = readings.map((reading) => new Date(reading.receivedAtUtc).getTime())
  return {
    total: readings.length,
    measured: values.length,
    missing: readings.length - values.length,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    from: times.length ? Math.min(...times) : null,
    to: times.length ? Math.max(...times) : null,
  }
}
