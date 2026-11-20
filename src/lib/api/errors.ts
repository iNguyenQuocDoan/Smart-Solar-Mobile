// The one place that turns a backend response into data or an ApiError. Every response is wrapped in
// `{ isSuccess, traceId, data, error: { code, message, details, fieldErrors } }`.
// No value imports through "@/" so `node --test` can load this file.

const messages: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác, hoặc tài khoản chưa thể đăng nhập.',
  AUTH_REFRESH_TOKEN_INVALID: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  AUTH_FORBIDDEN: 'Tài khoản không có quyền xem nội dung này.',
  SURVEY_SLOT_UNAVAILABLE: 'Giờ vừa chọn không còn trống. Hãy chọn giờ khác.',
  INVALID_BOOKING_STATE: 'Lịch hẹn đã thay đổi. Hãy tải lại để xem trạng thái mới nhất.',
  PROPERTY_SITE_LOCATION_REQUIRED: 'Địa điểm chưa có mã phường, xã nên chưa thể xếp lịch khảo sát.',
  CUSTOMER_ALREADY_EXISTS: 'Tài khoản đã có hồ sơ khách hàng.',
  PRE_SURVEY_INCOMPLETE: 'Bản đánh giá còn thiếu số liệu mặt lắp.',
  PRE_SURVEY_CONCURRENTLY_MODIFIED: 'Bản đánh giá vừa được sửa ở thiết bị khác. Hãy tải lại dữ liệu mới nhất.',
  PRE_SURVEY_NOT_EDITABLE: 'Bản đánh giá đã gửi nên không thể sửa tiếp.',
  PRE_SURVEY_ALREADY_SUBMITTED: 'Bản đánh giá này đã được gửi trước đó.',
  TECHNICIAN_NOT_ASSIGNED: 'Lịch này không còn được giao cho bạn.',
  APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch hẹn, hoặc lịch không còn giao cho bạn.',
  APPOINTMENT_ALREADY_TAKEN: 'Lịch này vừa có người nhận trước.',
  APPOINTMENT_CONCURRENCY_CONFLICT: 'Lịch hẹn vừa được thay đổi ở nơi khác. Hãy tải lại rồi thử lần nữa.',
  TECHNICIAN_SCHEDULE_CONFLICT: 'Bạn đã có lịch khác, hoặc chưa đủ thời gian nghỉ giữa hai việc, vào giờ này.',
  DAILY_LIMIT_REACHED: 'Bạn đã đủ số lịch trong ngày này.',
  OUTSIDE_WORKING_HOURS: 'Giờ hẹn nằm ngoài giờ làm của bạn.',
  TECHNICIAN_ON_LEAVE: 'Bạn đang nghỉ vào thời gian này.',
  TECHNICIAN_SCHEDULING_DISABLED: 'Bạn đang tắt nhận lịch.',
  TECHNICIAN_OUTSIDE_ZONE: 'Công trình không thuộc khu vực của bạn.',
  ONSITE_SURVEY_IN_PROGRESS: 'Buổi khảo sát đã bắt đầu nên không đổi được lịch này.',
  SCHEDULING_VALIDATION_FAILED: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  SURVEY_REQUEST_CLOSED: 'Yêu cầu này đã đóng nên không thay đổi được nữa.',
  SURVEY_REQUEST_CONTRACT_EXISTS: 'Yêu cầu đã có hợp đồng nên không rút được. Liên hệ bộ phận kinh doanh.',
  SURVEY_REQUEST_APPOINTMENT_OPEN: 'Yêu cầu còn lịch khảo sát đang hẹn. Huỷ lịch trước rồi rút yêu cầu.',
  SURVEY_REQUEST_CLOSURE_CONFLICT: 'Báo giá của yêu cầu vừa thay đổi. Hãy tải lại rồi thử lần nữa.',
  SCHEMA_NOT_READY: 'Hệ thống đang cập nhật. Vui lòng thử lại sau ít phút.',
  NO_ZONE_COVERAGE: 'Phường, xã của công trình chưa có kỹ thuật viên nhận lịch. Hãy nhờ Smart Solar xếp kỹ thuật viên.',
  ZONE_NOT_SERVICEABLE: 'Khu vực của công trình đang tạm ngừng nhận lịch. Hãy nhờ Smart Solar xếp kỹ thuật viên.',
  NO_ZONE_TECHNICIAN: 'Khu vực của công trình chưa có kỹ thuật viên. Hãy nhờ Smart Solar xếp kỹ thuật viên.',
  NO_AVAILABLE_TECHNICIAN:
    'Kỹ thuật viên của khu vực đã kín lịch. Chọn ngày khác hoặc nhờ Smart Solar xếp kỹ thuật viên.',
  SCHEDULE_CONFLICT: 'Giờ này kỹ thuật viên của khu vực đã kín lịch. Chọn giờ khác.',
  DISPATCH_REQUEST_OPEN:
    'Yêu cầu đang chờ Smart Solar xếp kỹ thuật viên. Trả lời đề xuất hoặc huỷ yêu cầu xếp lịch trước.',
  DISPATCH_NOT_NEEDED: 'Khu vực của công trình đã có giờ trống vào các khung bạn chọn. Hãy đặt giờ trực tiếp.',
  DISPATCH_INVALID_STATE: 'Yêu cầu xếp kỹ thuật viên vừa đổi trạng thái. Hãy tải lại để xem.',
  DISPATCH_STALE_REVISION: 'Yêu cầu vừa được cập nhật. Hãy tải lại rồi thử lần nữa.',
  PROPOSAL_NOT_PENDING: 'Đề xuất này đã được trả lời hoặc không còn hiệu lực.',
  PROPOSAL_EXPIRED: 'Đề xuất đã hết hạn trả lời. Smart Solar sẽ gửi đề xuất khác.',
  INVALID_BOOKING_TIME: 'Giờ này không còn đặt được. Hãy chọn giờ khác.',
  INSTALLATION_PROJECT_NOT_FOUND: 'Không tìm thấy công trình.',
  IOT_BINDING_NOT_FOUND: 'Công trình chưa gắn thiết bị đo.',
  IOT_VALIDATION_FAILED: 'Khoảng ngày hoặc số dòng cần tải chưa hợp lệ.',
  FEATURE_PENDING_MIGRATION: 'Chức năng này chưa được bật trên hệ thống.',
  IOT_STORAGE_UNAVAILABLE: 'Hệ thống giám sát tạm thời chưa phản hồi. Vui lòng thử lại sau.',
}

const statusMessages: Record<number, string> = {
  400: 'Dữ liệu gửi lên chưa hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu vừa thay đổi. Hãy tải lại và thử lần nữa.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  500: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
  503: 'Hệ thống đang bảo trì. Vui lòng thử lại sau.',
}

export const NETWORK_ERROR_MESSAGE = 'Không kết nối được. Kiểm tra mạng rồi thử lại.'
export const SESSION_EXPIRED_MESSAGE = statusMessages[401]!

/** `status` 0 is a network failure or timeout (no response at all) */
export class ApiError extends Error {
  status: number
  code: string | null
  /** Seconds to wait before calling again, from the Retry-After header (429, 503) */
  retryAfter: number | null
  fieldErrors: Record<string, string[]> | null

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    retryAfter: number | null = null,
    fieldErrors: Record<string, string[]> | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    this.fieldErrors = fieldErrors
  }
}

export function isNetworkError(error: unknown) {
  return error instanceof ApiError && error.status === 0
}

/** Retry-After is either a number of seconds or an HTTP date; anything else is ignored */
export function parseRetryAfter(value: string | null | undefined, now = Date.now()): number | null {
  if (value == null) return null
  const text = value.trim()
  if (!text) return null
  if (/^\d+$/.test(text)) return Number(text)
  const at = Date.parse(text)
  if (Number.isNaN(at)) return null
  return Math.max(0, Math.ceil((at - now) / 1000))
}

type RawError = {
  code?: unknown
  message?: unknown
  fieldErrors?: unknown
  error?: { code?: unknown; message?: unknown; fieldErrors?: unknown } | null
} | null

const isEnvelope = (body: unknown): body is { isSuccess?: boolean; data?: unknown } =>
  Boolean(body) && typeof body === 'object' && 'isSuccess' in (body as object)

/**
 * Turns a failed response into an ApiError. The backend's messages are English, so they are used only when no Vietnamese
 * message fits the code or the HTTP status
 */
export function apiErrorFrom(status: number, body: unknown, retryAfterHeader?: string | null): ApiError {
  const raw = (body && typeof body === 'object' ? body : null) as RawError
  const codeValue = raw?.error?.code ?? raw?.code
  const messageValue = raw?.error?.message ?? raw?.message
  const fieldValue = raw?.error?.fieldErrors ?? raw?.fieldErrors
  const code = typeof codeValue === 'string' ? codeValue : null
  const message =
    messages[code ?? ''] ??
    statusMessages[status] ??
    (typeof messageValue === 'string' ? messageValue : null) ??
    'Đã xảy ra lỗi. Vui lòng thử lại.'
  const fieldErrors = fieldValue && typeof fieldValue === 'object' ? (fieldValue as Record<string, string[]>) : null
  return new ApiError(message, status, code, parseRetryAfter(retryAfterHeader), fieldErrors)
}

/** Opens `data` of a successful response; an envelope with `isSuccess: false` or a non-2xx status throws ApiError */
export function unwrapResponse<T>(status: number, body: unknown, retryAfterHeader?: string | null): T {
  const ok = status >= 200 && status < 300
  if (isEnvelope(body)) {
    if (body.isSuccess === false || !ok) throw apiErrorFrom(status, body, retryAfterHeader)
    return body.data as T
  }
  if (!ok) throw apiErrorFrom(status, body, retryAfterHeader)
  return body as T
}

export function sessionExpiredError() {
  return new ApiError(SESSION_EXPIRED_MESSAGE, 401)
}
