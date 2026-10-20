import type { IconName } from '@/components/ui'
import type { MonitoringDevice } from '@/lib/monitoring/types'
import type { Tone } from '@/lib/status'

export type StatusView = {
  label: string
  tone: Tone
  icon: IconName
  /** True only when the backend says the device is live and our last refresh succeeded. */
  current: boolean
  note: string | null
}

/**
 * Presents the backend-reported status. `refreshFailed` means the app could not reload data,
 * so even a "live" device is shown as last-known values rather than live ones.
 */
export function deviceStatusView(device: MonitoringDevice, refreshFailed = false): StatusView {
  if (!device.lastReading) {
    return { label: 'Chưa có dữ liệu', tone: 'neutral', icon: 'hourglass-outline', current: false, note: 'Thiết bị đã được gắn với công trình nhưng chưa gửi số đo nào.' }
  }
  if (refreshFailed) {
    return { label: 'Chưa làm mới được', tone: 'warning', icon: 'sync-outline', current: false, note: 'Không tải được dữ liệu mới. Đây là số đo cuối cùng ứng dụng đã tải.' }
  }
  if (device.status === 'live') return { label: 'Đang nhận dữ liệu', tone: 'success', icon: 'radio-outline', current: true, note: null }
  if (device.status === 'stale') {
    return { label: 'Dữ liệu cũ', tone: 'warning', icon: 'time-outline', current: false, note: 'Thiết bị chưa gửi số đo mới. Số liệu này có thể đã thay đổi.' }
  }
  if (device.status === 'offline') {
    return { label: 'Mất kết nối', tone: 'danger', icon: 'cloud-offline-outline', current: false, note: 'Thiết bị đang mất kết nối. Đây là số đo cuối cùng nhận được.' }
  }
  return { label: 'Chưa rõ trạng thái', tone: 'neutral', icon: 'help-circle-outline', current: false, note: 'Hệ thống chưa xác định được thiết bị còn kết nối hay không. Hãy xem thời điểm nhận số đo.' }
}
