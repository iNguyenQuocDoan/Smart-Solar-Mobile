/**
 * One reading exactly as the IoT API stores it (iot/server: POST /api/iot/readings,
 * GET /api/iot/devices/:deviceId/readings). These are the only fields the ESP32 sends today.
 */
export type DeviceReading = {
  id: number
  deviceId: string
  /** Ampere. Null while the ACS712 is not calibrated, or when a sample carries only `adcRaw`. */
  currentA: number | null
  adcRaw: number | null
  isTest: boolean
  /** ESP32 `millis()` at send time. */
  uptimeMs: number | null
  /** Set by the server when it receives the request, never by the device. */
  receivedAtUtc: string
}

/**
 * Connection state as reported by the backend. The app never derives it from time thresholds:
 * until the backend defines a rule, a device should come back as `unknown`.
 */
export type DeviceStatus = 'live' | 'stale' | 'offline' | 'unknown'

export type MonitoringDevice = {
  deviceId: string
  name: string
  status: DeviceStatus
  lastReading: DeviceReading | null
}

export type MonitoringSite = {
  siteId: string
  name: string
  address: string | null
  devices: MonitoringDevice[]
}

export type MonitoringSource = {
  listSites: () => Promise<MonitoringSite[]>
  /** Newest first, like GET /api/iot/devices/:deviceId/readings?limit= (1–100). */
  listReadings: (deviceId: string, limit: number) => Promise<DeviceReading[]>
}

export type HistoryWindow =
  | { id: string; group: string; label: string; supported: true; limit: number }
  | { id: string; group: string; label: string; supported: false; reason: string }

const BY_COUNT = 'Số đo gần nhất'
const BY_TIME = 'Theo thời gian'
const NO_TIME_FILTER = 'Máy chủ IoT hiện chỉ trả tối đa 100 số đo gần nhất và chưa lọc được theo thời gian.'

// The IoT API accepts `limit` 1–100 and has no time-range query, so only count windows are selectable.
export const HISTORY_WINDOWS: HistoryWindow[] = [
  { id: 'last-20', group: BY_COUNT, label: '20', supported: true, limit: 20 },
  { id: 'last-50', group: BY_COUNT, label: '50', supported: true, limit: 50 },
  { id: 'last-100', group: BY_COUNT, label: '100', supported: true, limit: 100 },
  {
    id: 'day',
    group: BY_TIME,
    label: '24 giờ',
    supported: false,
    reason: `Chưa xem được theo 24 giờ. ${NO_TIME_FILTER}`,
  },
  {
    id: 'week',
    group: BY_TIME,
    label: '7 ngày',
    supported: false,
    reason: `Chưa xem được theo 7 ngày. ${NO_TIME_FILTER}`,
  },
]

export const OVERVIEW_READING_LIMIT = 20
