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
  VALIDATION_FAILED: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô được đánh dấu.',
  INVALID_STATE_TRANSITION: 'Trạng thái đã thay đổi nên không làm được thao tác này. Tải lại để xem trạng thái mới.',
  // Tải tệp lên kho (câu của web)
  FILE_INVALID_PURPOSE: 'Mục đích tải tệp không hợp lệ.',
  FILE_UPLOAD_NOT_ALLOWED: 'Tài khoản của bạn không được tải loại tệp này lên.',
  FILE_TYPE_NOT_ALLOWED: 'Loại tệp này không được nhận ở đây. Kiểm tra loại tệp và đuôi tên tệp.',
  FILE_TOO_LARGE: 'Tệp rỗng hoặc lớn hơn cỡ cho phép.',
  FILE_BUCKET_NOT_ALLOWED: 'Chức năng tải tệp đang tạm tắt. Liên hệ quản trị hệ thống.',
  FILE_INVALID_OBJECT_KEY: 'Vị trí lưu tệp không hợp lệ. Tải lại tệp.',
  FILE_ALREADY_REGISTERED: 'Tệp này đã được đăng ký. Tải lại tệp.',
  FILE_NOT_FOUND: 'Không tìm thấy tệp, hoặc tệp do tài khoản khác tải lên.',
  FILE_NOT_VERIFIED: 'Tệp chưa được xác minh nên chưa dùng được.',
  FILE_WRONG_PURPOSE: 'Tệp này được tải lên cho việc khác nên không dùng ở đây được.',
  FILE_NOT_OWNED: 'Tệp này do tài khoản khác tải lên.',
  FILE_ALREADY_LINKED: 'Ảnh này đã được gắn trước đó.',
  FILE_CONTENT_CHANGED: 'Tệp trên kho đã thay đổi sau khi xác minh nên không dùng được nữa.',
  FILE_STORAGE_UNAVAILABLE: 'Hệ thống chưa kiểm tra được tệp. Thử lại sau ít phút.',
  FILE_NOT_SIGNABLE: 'Không mở được tệp này.',
  FILE_OBJECT_MISSING: 'Tệp không còn trên kho lưu trữ (bị xoá hoặc đổi). Chọn lại tệp rồi thử lại.',
  STORAGE_NOT_CONFIGURED: 'Chức năng tải tệp đang tạm tắt. Liên hệ quản trị hệ thống.',
  STORAGE_UNAVAILABLE: 'Tạm thời chưa mở được tệp. Thử lại sau ít phút.',
  // Khảo sát tại công trình
  ONSITE_APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch khảo sát, hoặc lịch không còn giao cho bạn.',
  ONSITE_APPOINTMENT_NOT_CONFIRMED: 'Nhận lịch này trước rồi mới khảo sát được.',
  ONSITE_SURVEY_TOO_EARLY: 'Chưa tới giờ bắt đầu khảo sát. Bắt đầu được khi gần tới giờ hẹn.',
  ONSITE_SURVEY_NOT_FOUND: 'Bấm Bắt đầu khảo sát trước rồi mới thêm ảnh được.',
  ONSITE_SURVEY_ALREADY_COMPLETED: 'Khảo sát này đã hoàn thành. Muốn sửa thì gửi bổ sung biên bản kèm lý do.',
  ONSITE_SURVEY_NOT_COMPLETED: 'Biên bản chưa hoàn thành nên chưa bổ sung được. Sửa thẳng trên biên bản rồi lưu.',
  ONSITE_SURVEY_NOT_STARTED: 'Bấm Bắt đầu khảo sát tại công trình trước khi hoàn thành.',
  ONSITE_SURVEY_INCOMPLETE: 'Còn thiếu số đo bắt buộc. Điền các ô được đánh dấu rồi hoàn thành lại.',
  ONSITE_SURVEY_STALE_REVISION: 'Biên bản vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  ONSITE_SURVEY_BOM_VALIDATION_FAILED:
    'Bảng vật tư có sản phẩm không còn bán, sai loại hoặc số lượng chưa đúng. Sửa các dòng được đánh dấu rồi thử lại.',
  ONSITE_SURVEY_EVIDENCE_REQUIRED: 'Cần ít nhất một ảnh loại Mái trước khi hoàn thành khảo sát.',
  ONSITE_SURVEY_ATTACHMENT_NOT_FOUND: 'Không tìm thấy ảnh này trong biên bản.',
  // Báo giá lắp đặt
  QUOTATION_NOT_FOUND: 'Không tìm thấy báo giá.',
  QUOTATION_SURVEY_NOT_COMPLETED: 'Kỹ thuật viên chưa hoàn thành khảo sát tại công trình nên chưa lập báo giá được.',
  QUOTATION_DRAFT_EXISTS: 'Yêu cầu này đã có một bản nháp báo giá. Đã tải lại, sửa tiếp bản đó.',
  QUOTATION_ACTIVE_EXISTS: 'Yêu cầu này đã có báo giá đã chốt. Lập bản sửa từ báo giá đó.',
  QUOTATION_NOT_DRAFT: 'Báo giá đã chốt nên không sửa được nữa. Lập bản sửa để đổi nội dung.',
  QUOTATION_NOT_ISSUED:
    'Báo giá này chưa chốt hoặc không còn chờ khách quyết định (đã có bản mới hoặc vừa thay đổi). Đã tải lại.',
  QUOTATION_EXPIRED: 'Báo giá đã hết hạn. Lập bản sửa để lấy giá danh mục hiện tại.',
  QUOTATION_INVALID_LINE:
    'Số liệu báo giá chưa hợp lệ: số lượng phải lớn hơn 0, đơn giá không âm, giảm giá không quá số tiền trước giảm và tổng phải lớn hơn 0.',
  QUOTATION_EMPTY: 'Thêm ít nhất một dòng trước khi chốt báo giá.',
  QUOTATION_STALE_REVISION: 'Báo giá vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  QUOTATION_PRODUCT_UNAVAILABLE: 'Sản phẩm này đã ngừng bán hoặc không bán bằng VND. Chọn sản phẩm khác.',
  QUOTATION_ALREADY_ACCEPTED: 'Khách đã đồng ý báo giá này. Mở hợp đồng 30/70 để thu khoản 30%.',
  QUOTATION_PAYMENT_STARTED:
    'Đã mở thanh toán khoản 30% (hoặc đã nhận tiền) nên chưa ghi khách đổi ý được. Huỷ mã QR / bỏ chọn tiền mặt trước; tiền đã nhận thì không rút được.',
  QUOTATION_NOT_AGREED: 'Ghi khách đồng ý trước rồi mới mở thanh toán.',
  QUOTATION_CANNOT_REVISE: 'Không lập bản sửa được vì khách vừa đồng ý hoặc báo giá vừa thay đổi. Đã tải lại.',
  QUOTATION_SURVEY_CHANGED:
    'Biên bản khảo sát được bổ sung sau khi lập báo giá này nên báo giá không dùng tiếp được. Đã tải lại.',
  QUOTATION_SURVEY_NOT_FEASIBLE: 'Kỹ thuật viên kết luận công trình không lắp được nên không lập báo giá.',
  QUOTATION_REQUEST_CLOSED: 'Yêu cầu khảo sát đã đóng hoặc khách đã rút nên không làm tiếp báo giá được.',
  QUOTATION_PRICE_MISSING: 'Sản phẩm này chưa có giá trong danh mục nên chưa báo giá được. Nhờ quản trị cập nhật giá.',
  QUOTATION_SURVEY_NOT_FOUND:
    'Không tìm thấy yêu cầu khảo sát, hoặc bạn không phải kỹ thuật viên đã khảo sát yêu cầu này.',
  // Hợp đồng 30/70, thu từng khoản, hợp đồng giấy đã ký
  CONTRACT_NOT_FOUND: 'Không tìm thấy hợp đồng, hoặc bạn không phụ trách hợp đồng này.',
  CONTRACT_PAYMENT_PLAN_NOT_APPLICABLE:
    'Thao tác này không dùng cho hợp đồng này (hợp đồng trả 30/70 và hợp đồng trả 100% theo cách cũ có các bước khác nhau). Đã tải lại.',
  CONTRACT_INSTALLMENT_NOT_FOUND: 'Không tìm thấy khoản thanh toán này của hợp đồng.',
  CONTRACT_INSTALLMENT_NOT_PAYABLE:
    'Khoản này chưa trả được lúc này: khoản 70% mở khi khách nghiệm thu, khoản 30% chỉ trả trước khi ký hợp đồng giấy.',
  CONTRACT_INSTALLMENT_ALREADY_PAID: 'Khoản này đã được thanh toán. Đã tải lại.',
  CONTRACT_PAYMENT_PLAN_AMOUNT_NOT_SUPPORTED: 'Tổng báo giá quá nhỏ để chia hai khoản 30% và 70%. Lập bản sửa.',
  CONTRACT_DEPOSIT_REQUIRED: 'Khoản 30% chưa được xác minh nên chưa tải hợp đồng giấy đã ký được.',
  CONTRACT_SIGNATURE_NOT_STARTED: 'Ghi số trang của hợp đồng giấy trước khi tải từng trang.',
  CONTRACT_SIGNATURE_SET_NOT_FOUND: 'Chưa có bộ trang hợp đồng giấy nào.',
  CONTRACT_SIGNED_PAGE_OUT_OF_RANGE: 'Số trang này nằm ngoài số trang đã khai.',
  CONTRACT_SIGNED_PAGES_INCOMPLETE: 'Còn thiếu trang nên chưa chốt được. Tải đủ các trang còn thiếu.',
  CONTRACT_SIGNATURE_ALREADY_FINALIZED: 'Các trang hợp đồng giấy đã được chốt nên không sửa được nữa.',
  CONTRACT_INVALID_STATE:
    'Hợp đồng vừa đổi trạng thái nên không làm được thao tác này. Đã tải lại để xem trạng thái mới.',
  CONTRACT_STALE_REVISION: 'Hợp đồng vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  // Thanh toán PayOS / tiền mặt
  PAYMENT_CHECKOUT_IN_PROGRESS:
    'Đang có một lần thanh toán chưa xong cho gói cùng loại hoặc cho hợp đồng này. Thanh toán hoặc huỷ đơn đó trước.',
  PAYMENT_PROVIDER_NOT_CONFIGURED: 'Thanh toán trực tuyến đang tạm tắt. Liên hệ Smart Solar.',
  PAYMENT_PROVIDER_ERROR: 'PayOS chưa tạo được link thanh toán. Thử lại sau ít phút.',
  PAYMENT_AMOUNT_NOT_SUPPORTED: 'Số tiền thanh toán không hợp lệ hoặc vượt giới hạn của một lần thanh toán.',
  PAYMENT_TOO_MANY_ATTEMPTS: 'Bạn đã tạo nhiều link thanh toán trong ít phút. Chờ một lát rồi thử lại.',
  PAYMENT_ATTEMPT_NOT_FOUND: 'Không tìm thấy lần thanh toán này.',
  PAYMENT_CONTRACT_NOT_FOUND: 'Không tìm thấy hợp đồng.',
  PAYMENT_ALREADY_PAID: 'Khoản này đã được thanh toán. Đã tải lại.',
  PAYMENT_CASH_SELECTED: 'Đã chọn trả tiền mặt cho khoản này. Bỏ chọn tiền mặt trước nếu muốn trả qua PayOS.',
  PAYMENT_CASH_NOT_SELECTED: 'Khách chưa chọn trả tiền mặt cho khoản này, hoặc vừa bỏ chọn. Đã tải lại.',
  // Lắp đặt của kỹ thuật viên
  INSTALLATION_INVALID_STATE: 'Công trình vừa đổi trạng thái nên chưa làm được thao tác này. Đã tải lại.',
  INSTALLATION_STALE_REVISION: 'Công trình vừa được cập nhật ở nơi khác. Đã tải lại, kiểm tra rồi thử lại.',
  INSTALLATION_REASON_REQUIRED: 'Ghi lý do.',
  INSTALLATION_ASSIGNMENT_NOT_PENDING: 'Phân công này không còn chờ bạn trả lời.',
  INSTALLATION_ASSIGNMENT_NOT_ACCEPTED: 'Nhận việc trước rồi mới thi công được.',
  INSTALLATION_TOO_EARLY_TO_START: 'Chưa tới ngày thi công nên chưa bắt đầu được.',
  INSTALLATION_SCHEDULE_EXPIRED: 'Đã hết khung giờ thi công. Báo quản lý xếp lại lịch trước khi bắt đầu.',
  INSTALLATION_CHECKLIST_INCOMPLETE: 'Quản lý chưa hoàn tất các hạng mục bắt buộc trước thi công.',
  INSTALLATION_EVIDENCE_REQUIRED: 'Cần ít nhất một ảnh thi công của lượt này trước khi gửi báo cáo hoàn thành.',
  INSTALLATION_ASSETS_REQUIRED: 'Ghi tấm pin và inverter đã lắp trước khi gửi báo cáo hoàn thành.',
  INSTALLATION_DUPLICATE_SERIAL: 'Số serial này đã được ghi trên hệ thống. Kiểm tra lại.',
  INSTALLATION_ASSET_PRODUCT_VALIDATION_FAILED:
    'Sản phẩm đã chọn không đúng loại thiết bị hoặc đã ngừng bán. Chọn lại.',
  INSTALLATION_ASSET_QUANTITY_VALIDATION_FAILED: 'Số lượng chưa hợp lệ: ghi từ 1 đến 10.000 thiết bị.',
  INSTALLATION_SUBSTITUTION_APPROVAL_REQUIRED:
    'Thiết bị đã ghi khác hợp đồng. Chờ quản lý duyệt thay đổi rồi mới gửi được báo cáo hoàn thành.',
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
  /** `error.details` của backend: mã tệp của FILE_STORAGE_UNAVAILABLE, dòng lỗi của QUOTATION_PRICE_MISSING… */
  details: unknown

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    retryAfter: number | null = null,
    fieldErrors: Record<string, string[]> | null = null,
    details: unknown = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
    this.fieldErrors = fieldErrors
    this.details = details
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
  error?: { code?: unknown; message?: unknown; fieldErrors?: unknown; details?: unknown } | null
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
  const details = raw?.error?.details ?? null
  return new ApiError(message, status, code, parseRetryAfter(retryAfterHeader), fieldErrors, details)
}

/** Câu tiếng Việt của một mã lỗi backend, nếu có */
export const messageForCode = (code: string) => messages[code] ?? null

/** Lỗi do bản trên hệ thống vừa đổi ở nơi khác (409 lệch revision): tải lại, báo người dùng, không gửi lại lệnh cũ */
export const isStaleRevisionError = (error: unknown) =>
  error instanceof ApiError && typeof error.code === 'string' && error.code.endsWith('_STALE_REVISION')

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
