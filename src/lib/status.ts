import type { CustomerAppointment, CustomerRequest } from '@/lib/api/types'

export type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'info'

type Meta = { label: string; tone: Tone }
type Viewer = 'customer' | 'technician'

const APPOINTMENT_LABELS: Record<string, string> = {
  PENDING_ACCEPTANCE: 'Chờ kỹ thuật viên nhận',
  ESCALATED: 'Không ai nhận kịp, cần phân công',
  ACCEPTED: 'Kỹ thuật viên đã nhận',
  ASSIGNED: 'Đã phân công kỹ thuật viên',
  COMPLETED: 'Đã khảo sát',
  CANCELLED: 'Đã huỷ',
}

// Kỹ thuật viên xem việc của chính mình nên gọi là "bạn"
const TECHNICIAN_LABELS: Record<string, string> = {
  ACCEPTED: 'Bạn đã nhận',
  ASSIGNED: 'Được phân công cho bạn',
}

// Đỏ là việc người xem phải làm: kỹ thuật viên thấy lịch đang chờ người nhận
const APPOINTMENT_TONES: Record<Viewer, Record<string, Tone>> = {
  customer: { PENDING_ACCEPTANCE: 'info', ESCALATED: 'info', ACCEPTED: 'success', ASSIGNED: 'success' },
  technician: { PENDING_ACCEPTANCE: 'danger', ESCALATED: 'danger', ACCEPTED: 'success', ASSIGNED: 'success' },
}

// Trạng thái khách thấy (acceptanceStatus), khách không thấy ai đang giữ chỗ
const ACCEPTANCE_STATUSES: Record<string, Meta> = {
  WAITING_FOR_TECHNICIAN: { label: 'Đã đặt giờ, chờ kỹ thuật viên nhận', tone: 'info' },
  NEEDS_STAFF: { label: 'Đã đặt giờ, nhân viên đang xếp kỹ thuật viên', tone: 'info' },
  CONFIRMED: { label: 'Kỹ thuật viên đã nhận lịch', tone: 'success' },
  COMPLETED: { label: 'Đã khảo sát xong', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

// Vì sao ngày đã chọn không có giờ để đặt (coverageStatus của danh sách giờ trống)
const COVERAGE_STATUSES: Record<string, string> = {
  SITE_LOCATION_REQUIRED: 'Địa điểm chưa có mã phường, xã nên chưa biết thuộc khu vực nào.',
  NO_ZONE_COVERAGE: 'Phường, xã của công trình chưa thuộc khu vực phục vụ nào.',
  ZONE_NOT_SERVICEABLE: 'Khu vực của công trình đang tạm ngừng nhận lịch.',
  NO_ZONE_TECHNICIAN: 'Khu vực của công trình chưa có kỹ thuật viên.',
  NO_AVAILABLE_TECHNICIAN: 'Kỹ thuật viên của khu vực đã kín lịch trong những ngày tới.',
  SCHEDULE_CONFLICT: 'Kỹ thuật viên của khu vực đã kín lịch ngày này. Thử ngày khác.',
}

// Vì sao kỹ thuật viên chưa nhận được một lịch đang chờ
const INELIGIBLE_REASONS: Record<string, string> = {
  TECHNICIAN_INACTIVE: 'tài khoản không hoạt động',
  TECHNICIAN_SCHEDULING_DISABLED: 'đang tắt nhận lịch',
  TECHNICIAN_OUTSIDE_ZONE: 'không thuộc khu vực của công trình',
  OUTSIDE_WORKING_HOURS: 'ngoài giờ làm',
  TECHNICIAN_ON_LEAVE: 'đang nghỉ',
  TECHNICIAN_SCHEDULE_CONFLICT: 'trùng lịch khác',
  DAILY_LIMIT_REACHED: 'đã đủ số lịch trong ngày',
  SCHEDULE_CONFLICT: 'trùng lịch khác',
}

const ASSIGNMENT_SOURCES: Record<string, string> = {
  SELF_ACCEPTED: 'Bạn tự nhận',
  SALES_ASSIGNED: 'Kinh doanh phân công',
  MANAGER_OVERRIDE: 'Quản lý phân công',
  MANAGER_DISPATCH: 'Quản lý điều phối',
}

const SURFACE_NAMES: Record<string, string> = {
  Rooftop: 'Mái nhà',
  Ground: 'Mặt đất',
  Carport: 'Mái che bãi xe',
  Facade: 'Mặt dựng',
  Other: 'Khác',
}

type RequestState = Pick<CustomerRequest, 'status'> & {
  appointment: Pick<CustomerAppointment, 'status' | 'acceptanceStatus'> | null
}

/** Khách đặt giờ được khi yêu cầu chưa có lịch hiệu lực */
export function canBook(request: RequestState) {
  return !request.appointment && request.status === 'PENDING'
}

export function customerStatus(request: RequestState): Meta {
  if (request.status === 'COMPLETED') return { label: 'Đã khảo sát xong', tone: 'neutral' }
  if (request.status === 'CANCELLED') return { label: 'Đã huỷ', tone: 'neutral' }
  if (!request.appointment) {
    return canBook(request)
      ? { label: 'Chưa đặt giờ khảo sát', tone: 'danger' }
      : { label: 'Chưa có lịch hẹn', tone: 'neutral' }
  }
  return (
    ACCEPTANCE_STATUSES[request.appointment.acceptanceStatus] ??
    appointmentStatus(request.appointment.status, 'customer')
  )
}

export function appointmentStatus(status: string, viewer: Viewer): Meta {
  const label =
    (viewer === 'technician' ? TECHNICIAN_LABELS[status] : undefined) ?? APPOINTMENT_LABELS[status] ?? 'Đang cập nhật'
  return { label, tone: APPOINTMENT_TONES[viewer][status] ?? 'neutral' }
}

/** Một lần đặt trong lịch sử của yêu cầu */
export function historyStatusLabel(status: string) {
  return status === 'CANCELLED' ? 'Đã huỷ hoặc đổi giờ' : appointmentStatus(status, 'customer').label
}

export function coverageText(status: string | null | undefined) {
  return (status && COVERAGE_STATUSES[status]) || null
}

export function ineligibleLabel(code: string | null | undefined) {
  return (code && INELIGIBLE_REASONS[code]) || 'đang bận'
}

/** Kỹ thuật viên có lịch này bằng cách nào */
export function assignmentSourceLabel(source: string | null | undefined) {
  return (source && ASSIGNMENT_SOURCES[source]) || '—'
}

export function surfaceLabel(value: string | null | undefined) {
  return value ? (SURFACE_NAMES[value] ?? value) : '—'
}
