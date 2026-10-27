export const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const dayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const dayText = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VN_TIME_ZONE,
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const timeText = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VN_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

export function todayVn() {
  return dayKey.format(new Date())
}

export function initialBookingDate() {
  const now = new Date()
  const today = dayKey.format(now)
  return timeText.format(now) >= '15:30' ? addDays(today, 1) : today
}

export function dateOf(iso: string) {
  return dayKey.format(new Date(iso))
}

export function addDays(date: string, count: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + count)
  return value.toISOString().slice(0, 10)
}

export function formatDay(date: string) {
  return dayText.format(new Date(`${date}T12:00:00Z`))
}

export function formatShortDate(date: string) {
  const [year, month, day] = date.split('-')
  return year && month && day ? `${day}/${month}` : date
}

export function formatTime(iso: string) {
  return timeText.format(new Date(iso))
}

export function formatTimeRange(start: string, end: string) {
  return `${formatTime(start)}–${formatTime(end)}`
}

export function formatAppointment(start: string, end: string) {
  return `${formatDay(dateOf(start))}, ${formatTimeRange(start, end)}`
}

/** "27/10 15:00" theo giờ Việt Nam */
export function formatMoment(iso: string | null | undefined) {
  return iso ? `${formatShortDate(dateOf(iso))} ${formatTime(iso)}` : '—'
}

export function formatArea(value: number | null | undefined) {
  return value == null ? '—' : `${decimal.format(value)} m²`
}

export function formatMoney(value?: number | null) {
  return value == null ? 'Liên hệ' : money.format(value)
}

export function shortCode(id: string) {
  return id.slice(0, 8).toUpperCase()
}
