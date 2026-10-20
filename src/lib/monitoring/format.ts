import { VN_TIME_ZONE, dateOf, formatShortDate } from '@/lib/format'

const ampere = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const axisNumber = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const integer = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const clock = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const clockShort = new Intl.DateTimeFormat('vi-VN', { timeZone: VN_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

function vnDate(time: string | number) {
  return dateOf(new Date(time).toISOString())
}

export function formatAmpere(value: number) {
  return ampere.format(value)
}

export function formatAxisNumber(value: number) {
  return axisNumber.format(value)
}

export function formatCurrent(value: number | null) {
  return value == null ? 'Không có số đo' : `${ampere.format(value)} A`
}

export function formatAdc(value: number) {
  return integer.format(value)
}

export function formatClock(time: string | number) {
  return clock.format(new Date(time))
}

/** "18/10" in Vietnam time. */
export function formatDayMonth(time: string | number) {
  return formatShortDate(vnDate(time))
}

function sameVnDay(time: string | number, now: number) {
  return vnDate(time) === vnDate(now)
}

/** "14:32:05" today, "14:32 · 18/10" on another day. */
export function formatReceivedAt(time: string | number, now: number) {
  return sameVnDay(time, now) ? clock.format(new Date(time)) : `${clockShort.format(new Date(time))} · ${formatDayMonth(time)}`
}

/** "14:32:05, 18/10/2026" in Vietnam time. */
export function formatFullTimestamp(time: string | number) {
  const [year] = vnDate(time).split('-')
  return `${clock.format(new Date(time))}, ${formatDayMonth(time)}/${year}`
}

export function formatRelative(time: string | number, now: number) {
  const seconds = Math.max(0, Math.round((now - new Date(time).getTime()) / 1000))
  if (seconds < 10) return 'vừa xong'
  if (seconds < 60) return `${seconds} giây trước`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}

export function formatUptime(ms: number) {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'Dưới 1 phút'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  return [days ? `${days} ngày` : '', hours ? `${hours} giờ` : '', rest ? `${rest} phút` : ''].filter(Boolean).join(' ')
}

/** Axis labels: seconds for short spans, add the date when the span crosses days. */
export function timeAxisFormatter(from: number, to: number) {
  if (!sameVnDay(from, to)) return (time: number) => `${clockShort.format(new Date(time))} ${formatDayMonth(time)}`
  if (to - from <= 30 * 60_000) return (time: number) => clock.format(new Date(time))
  return (time: number) => clockShort.format(new Date(time))
}
