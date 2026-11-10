import type { Tone } from '@/lib/status'
import { shortCode } from '@/lib/format'

// Công trình lắp đặt và thiết bị của khách, nhãn theo cổng khách hàng trên web

// Đỏ là việc khách phải làm (nghiệm thu)
const PROJECT_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING_ASSIGNMENT: { label: 'Đang xếp kỹ thuật viên', tone: 'info' },
  PENDING_TECHNICIAN_ACCEPTANCE: { label: 'Chờ kỹ thuật viên nhận việc', tone: 'info' },
  SCHEDULED: { label: 'Đã lên lịch lắp đặt', tone: 'info' },
  IN_PROGRESS: { label: 'Đang lắp đặt', tone: 'info' },
  PENDING_CUSTOMER_ACCEPTANCE: { label: 'Chờ bạn nghiệm thu', tone: 'danger' },
  REWORK_REQUIRED: { label: 'Đang sửa lại theo yêu cầu', tone: 'warning' },
  COMPLETED: { label: 'Đã bàn giao', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

export function projectStatus(status: string) {
  return PROJECT_STATUS[status] ?? { label: 'Đang xử lý', tone: 'info' as Tone }
}

const ASSET_TYPES: Record<string, string> = {
  PANEL: 'Tấm pin',
  INVERTER: 'Inverter',
  BATTERY: 'Pin lưu trữ',
  METER: 'Đồng hồ điện',
  OTHER: 'Thiết bị khác',
}

export function assetTypeLabel(type: string) {
  return ASSET_TYPES[type] ?? 'Thiết bị khác'
}

/** Khách không thấy tên công trình nên gọi theo mã */
export function projectTitle(projectId: string) {
  return `Công trình ${shortCode(projectId)}`
}

const oneDecimal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const whole = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

export function formatKwp(value: number) {
  return `${oneDecimal.format(value)} kWp`
}

export function formatKwhPerYear(value: number) {
  return `${whole.format(value)} kWh/năm`
}
