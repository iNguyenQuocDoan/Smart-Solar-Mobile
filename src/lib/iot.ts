import type { IotMeasuredQuantity, IotReading, IotReadingHistory } from '@/lib/api/types'
import type { Tone } from '@/lib/status'

// Luật giám sát IoT phía khách, bám IotTelemetryHandlers của backend 7d27054 và iotRules.ts của web. Chỉ để hiện và để hẹn giờ
// hỏi lại; số đo luôn là số backend trả. Chỉ import kiểu để chạy được bằng `node --test`

export const IOT_DEFAULTS = {
  /** IotMonitoring:ExpectedReportIntervalSeconds */
  reportIntervalSeconds: 10,
  /** IotMonitoring:OfflineAfterSeconds */
  offlineAfterSeconds: 30,
  /** Số dòng lịch sử mỗi lần tải; backend nhận 1–500 */
  historyPageSize: 100,
  historyLimitMax: 500,
} as const

/** Không bao giờ hỏi lại nhanh hơn 10 giây: cả màn phải dưới hạn mức 60 lần đọc IoT / phút / người */
export const MIN_POLL_SECONDS = 10
/** Mất kết nối / chưa có số đo: hỏi thưa hơn, chờ thiết bị gửi lại */
export const SLOW_POLL_SECONDS = 30
/** 429 không kèm Retry-After: chờ một phút như firmware */
export const DEFAULT_RATE_LIMIT_WAIT_SECONDS = 60

export const NOT_BOUND_TEXT = 'Công trình chưa gắn thiết bị đo'
export const NOT_MEASURED_TEXT = 'Chưa đo được'
export const MONITORING_UNAVAILABLE_TEXT = 'Hệ thống giám sát chưa sẵn sàng. Vui lòng thử lại sau.'

type ConnectionMeta = { label: string; tone: Tone; hint: string }

/** Nhãn trạng thái kết nối, giống web (Solar-client src/common/iot.ts) */
const CONNECTION: Record<string, ConnectionMeta> = {
  ONLINE: { label: 'Đang kết nối', tone: 'success', hint: 'Thiết bị đang gửi số đo đều đặn.' },
  OFFLINE: {
    label: 'Mất kết nối',
    tone: 'warning',
    hint: 'Thiết bị đã ngừng gửi số đo. Số đo cũ vẫn còn trong lịch sử.',
  },
  NO_DATA: {
    label: 'Chưa có số đo',
    tone: 'info',
    hint: 'Thiết bị đã gắn vào công trình nhưng chưa gửi số đo nào. Chưa có số đo không có nghĩa là dòng điện bằng 0.',
  },
  UNASSIGNED: { label: 'Chưa gắn công trình', tone: 'neutral', hint: 'Thiết bị chưa được gắn vào công trình nào.' },
  DISABLED: {
    label: 'Thiết bị bị khoá',
    tone: 'danger',
    hint: 'Smart Solar đã khoá thiết bị nên không nhận và không hiện số đo hiện tại.',
  },
}

export function connectionMeta(status: string | null | undefined): ConnectionMeta {
  return (status ? CONNECTION[status] : undefined) ?? { label: 'Không rõ trạng thái', tone: 'neutral', hint: '' }
}

// ---------- Hỏi lại số đo mới nhất ----------

/**
 * Nhịp hỏi lại theo chu kỳ gửi của thiết bị (mặc định 10 giây, không nhanh hơn 10 giây). OFFLINE / NO_DATA thì giãn ra khoảng 30
 * giây. Thiết bị bị khoá hay chưa gắn thì không hỏi nữa
 */
export function latestPollMs(
  connectionStatus: string | null | undefined,
  expectedReportIntervalSeconds: number | null | undefined,
): number | false {
  if (!connectionStatus || connectionStatus === 'DISABLED' || connectionStatus === 'UNASSIGNED') return false
  const interval = Math.max(
    MIN_POLL_SECONDS,
    finiteOr(expectedReportIntervalSeconds, IOT_DEFAULTS.reportIntervalSeconds),
  )
  if (connectionStatus === 'ONLINE') return interval * 1000
  return Math.max(SLOW_POLL_SECONDS, interval * 3) * 1000
}

type ErrorLike = { status?: number | null; code?: string | null; message?: string; retryAfter?: number | null }

const asError = (error: unknown): ErrorLike | null =>
  error && typeof error === 'object' && 'status' in error ? (error as ErrorLike) : null

/**
 * Sau một lần hỏi lỗi: 429 chờ đúng Retry-After (không gọi dồn); lỗi 4xx khác thì dừng hẳn; mất mạng hay 5xx thì thử lại thưa,
 * theo Retry-After nếu server có gửi
 */
export function pollAfterErrorMs(error: unknown): number | false {
  const e = asError(error)
  const status = e?.status ?? 0
  const wait = e?.retryAfter
  if (status === 429) return Math.max(MIN_POLL_SECONDS, wait ?? DEFAULT_RATE_LIMIT_WAIT_SECONDS) * 1000
  if (status >= 400 && status < 500) return false
  return Math.max(SLOW_POLL_SECONDS, wait ?? 0) * 1000
}

/**
 * Hẹn lần hỏi tiếp theo từ trạng thái query: lỗi thì theo `pollAfterErrorMs`; `data === null` là công trình không còn thiết bị
 * (404 IOT_BINDING_NOT_FOUND) nên dừng; còn lại theo trạng thái kết nối
 */
export function nextLatestPollMs(
  state: { status: string; data?: { connectionStatus: string } | null; error?: unknown },
  expectedReportIntervalSeconds: number | null | undefined,
): number | false {
  if (state.status === 'error') return pollAfterErrorMs(state.error)
  if (state.data === null) return false
  if (state.data === undefined) return false
  return latestPollMs(state.data.connectionStatus, expectedReportIntervalSeconds)
}

/** Lỗi không nên tự thử lại ngay: lỗi dữ liệu, quyền, không tìm thấy, quá hạn mức */
export const isFinalReadError = (error: unknown) => {
  const status = asError(error)?.status ?? 0
  return status >= 400 && status < 500
}

/** `…/device`, `…/readings/latest` trả 404 IOT_BINDING_NOT_FOUND khi công trình không có thiết bị: không phải lỗi */
export const isNoBinding = (error: unknown) => {
  const e = asError(error)
  return e?.status === 404 && e.code === 'IOT_BINDING_NOT_FOUND'
}

/** Số đo cũ hơn ngưỡng mất kết nối thì không gọi là "hiện tại" dù trạng thái chưa kịp đổi */
export function isStale(receivedAt: string, offlineAfterSeconds: number | null | undefined, now = Date.now()) {
  const at = Date.parse(receivedAt)
  const limit = finiteOr(offlineAfterSeconds, IOT_DEFAULTS.offlineAfterSeconds)
  return Number.isNaN(at) || now - at > limit * 1000
}

// ---------- Hiện số ----------

/**
 * "-0,2145 A": giữ đúng dấu như cảm biến đo (âm là kẹp ngược chiều), không làm tròn: in đúng các chữ số của số backend trả, chỉ
 * đổi dấu chấm thập phân thành dấu phẩy
 */
export function formatAmps(value: number) {
  return `${formatSigned(value)} A`
}

function formatSigned(value: number) {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  let digits = String(abs)
  if (digits.includes('e')) digits = abs.toFixed(20).replace(/0+$/, '').replace(/\.$/, '')
  return `${value < 0 ? '-' : ''}${digits.replace('.', ',')}`
}

/** Một đại lượng của khối `measured`: chưa đo được thì ghi rõ, không bao giờ hiện 0 thay cho null, không tự tính W hay kWh */
export function quantityText(q: IotMeasuredQuantity | null | undefined): string {
  if (!q || q.status !== 'MEASURED' || q.value === null || q.value === undefined) return NOT_MEASURED_TEXT
  return `${formatSigned(q.value)} ${q.unit}`
}

const VN_OFFSET_MS = 7 * 3600_000
const pad = (n: number) => String(n).padStart(2, '0')

/** Việt Nam không đổi giờ theo mùa nên giờ VN = UTC+7 */
function vnParts(ms: number) {
  const d = new Date(ms + VN_OFFSET_MS)
  return {
    year: d.getUTCFullYear(),
    month: pad(d.getUTCMonth() + 1),
    day: pad(d.getUTCDate()),
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  }
}

/** "14:05:10 19/11/2026" theo giờ Việt Nam, có giây vì thiết bị gửi 10 giây / lần */
export function formatReadingTime(iso: string | null | undefined) {
  const ms = iso ? Date.parse(iso) : Number.NaN
  if (Number.isNaN(ms)) return '—'
  const p = vnParts(ms)
  return `${p.time} ${p.day}/${p.month}/${p.year}`
}

/** Nhãn trục thời gian: "14:05:10"; khoảng vẽ dài hơn một ngày thì "19/11 14:05" */
export function formatAxisTime(ms: number, spanMs: number) {
  const p = vnParts(ms)
  return spanMs > 86_400_000 ? `${p.day}/${p.month} ${p.time.slice(0, 5)}` : p.time
}

/** "12 giây trước": chỉ để đọc nhanh, trạng thái kết nối vẫn theo backend */
export function formatAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return null
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 60) return `${seconds} giây trước`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)} giờ trước`
  return `${Math.floor(seconds / 86_400)} ngày trước`
}

// ---------- Lịch sử ----------

/** Gộp các trang lịch sử (mới nhất trước) theo `readingId`: tải lại hay trang chồng nhau cũng không lặp số đo */
export function mergeHistory(pages: readonly Pick<IotReadingHistory, 'items'>[]): IotReading[] {
  const seen = new Set<string>()
  const out: IotReading[] = []
  for (const page of pages)
    for (const r of page.items) {
      if (seen.has(r.readingId)) continue
      seen.add(r.readingId)
      out.push(r)
    }
  return out
}

export type ChartPoint = { readingId: string; at: number; currentAmps: number }

/** Điểm của biểu đồ: đúng các số đo backend trả, xếp theo thời gian tăng dần; không thêm điểm nào */
export function chartPoints(readings: readonly IotReading[]): ChartPoint[] {
  return readings
    .map((r) => ({ readingId: r.readingId, at: Date.parse(r.receivedAt), currentAmps: r.currentAmps }))
    .filter((p) => !Number.isNaN(p.at) && Number.isFinite(p.currentAmps))
    .sort((a, b) => a.at - b.at)
}

/**
 * Chia các điểm (đã xếp tăng dần) thành những đoạn liền: hai số đo cách nhau quá `maxGapMs` thì không nối, để khoảng thiếu số đo
 * hiện ra là khoảng trống chứ không phải một đường nội suy
 */
export function chartRuns(points: readonly ChartPoint[], maxGapMs: number): ChartPoint[][] {
  const runs: ChartPoint[][] = []
  let run: ChartPoint[] = []
  for (const p of points) {
    const prev = run[run.length - 1]
    if (prev && p.at - prev.at > maxGapMs) {
      runs.push(run)
      run = []
    }
    run.push(p)
  }
  if (run.length) runs.push(run)
  return runs
}

/** Khoảng giá trị của trục dọc, luôn gồm 0 để thấy rõ số âm hay dương */
export function valueRange(points: readonly ChartPoint[]) {
  let min = 0
  let max = 0
  for (const p of points) {
    if (p.currentAmps < min) min = p.currentAmps
    if (p.currentAmps > max) max = p.currentAmps
  }
  if (min === max) return { min: min - 1, max: max + 1 }
  return { min, max }
}

export type HistoryQuery = { from?: string; to?: string; before?: string; limit?: number }

/**
 * Query string của `…/readings`. Mọi giá trị được mã hoá: `nextBefore` có dạng "…+00:00" và dấu "+" để trần sẽ thành dấu cách
 */
export function historySearch({ from, to, before, limit = IOT_DEFAULTS.historyPageSize }: HistoryQuery) {
  const parts: string[] = []
  if (from) parts.push(`from=${encodeURIComponent(from)}`)
  if (to) parts.push(`to=${encodeURIComponent(to)}`)
  if (before) parts.push(`before=${encodeURIComponent(before)}`)
  parts.push(`limit=${encodeURIComponent(String(limit))}`)
  return `?${parts.join('&')}`
}

/** Trang sau dùng đúng `nextBefore` của trang trước; hết trang thì undefined */
export const nextHistoryCursor = (page: Pick<IotReadingHistory, 'hasMore' | 'nextBefore'>) =>
  page.hasMore && page.nextBefore ? page.nextBefore : undefined

/** "2026-11-19" theo giờ Việt Nam thành mốc đầu / cuối ngày gửi làm `from` / `to` */
export const vnDayStart = (date: string) => `${date}T00:00:00+07:00`
export const vnDayEnd = (date: string) => `${date}T23:59:59.999+07:00`

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD */
export function vnToday(now = Date.now()) {
  const p = vnParts(now)
  return `${p.year}-${p.month}-${p.day}`
}

export function shiftDay(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

// ---------- Lỗi ----------

const UNAVAILABLE_CODES = new Set(['FEATURE_PENDING_MIGRATION', 'SCHEMA_NOT_READY', 'IOT_STORAGE_UNAVAILABLE'])

/** 503 của giám sát: không hiện số thay thế nào */
export function isMonitoringUnavailable(error: unknown) {
  const e = asError(error)
  return e?.status === 503 || (e?.code != null && UNAVAILABLE_CODES.has(e.code))
}

/** Câu lỗi tiếng Việt của các màn giám sát */
export function iotErrorMessage(error: unknown): string {
  const e = asError(error)
  if (!e) return error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.'
  if (e.status === 0) return 'Mất kết nối mạng hoặc máy chủ không phản hồi. Kiểm tra mạng rồi thử lại.'
  if (isNoBinding(e)) return `${NOT_BOUND_TEXT}.`
  if (e.code === 'INSTALLATION_PROJECT_NOT_FOUND') return 'Không tìm thấy công trình.'
  if (e.status === 403 || e.code === 'AUTH_FORBIDDEN')
    return 'Tài khoản đang đăng nhập không phải tài khoản khách hàng nên không xem được số đo.'
  if (e.code === 'IOT_VALIDATION_FAILED' || e.status === 400) return 'Khoảng ngày hoặc số dòng cần tải chưa hợp lệ.'
  if (e.status === 429)
    return e.retryAfter
      ? `Bạn xem số đo quá nhanh. Ứng dụng sẽ thử lại sau ${e.retryAfter} giây.`
      : 'Bạn xem số đo quá nhanh. Chờ một lát rồi thử lại.'
  if (isMonitoringUnavailable(e)) return MONITORING_UNAVAILABLE_TEXT
  return e.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

function finiteOr(value: number | null | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}
