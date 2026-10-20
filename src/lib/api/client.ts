import { Platform } from 'react-native'
import type { ApiEnvelope, AuthTokens } from '@/lib/api/types'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/lib/auth/tokenStorage'

const fallbackUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api'
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? fallbackUrl
const REQUEST_TIMEOUT_MS = 15_000

// React Native's fetch has no default timeout, so an unreachable host would leave the UI spinning forever.
async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

const messages: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác, hoặc tài khoản chưa thể đăng nhập.',
  AUTH_REFRESH_TOKEN_INVALID: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  AUTH_FORBIDDEN: 'Tài khoản không có quyền xem nội dung này.',
  SURVEY_SLOT_UNAVAILABLE: 'Giờ vừa chọn không còn trống. Hãy chọn giờ khác.',
  INVALID_BOOKING_STATE: 'Lịch hẹn đã thay đổi. Hãy tải lại để xem trạng thái mới nhất.',
  PROPERTY_SITE_LOCATION_REQUIRED: 'Địa điểm chưa có tọa độ GPS nên chưa thể xếp lịch khảo sát.',
  CUSTOMER_ALREADY_EXISTS: 'Tài khoản đã có hồ sơ khách hàng.',
  PRE_SURVEY_INCOMPLETE: 'Bản đánh giá còn thiếu số liệu mặt lắp.',
  PRE_SURVEY_CONCURRENTLY_MODIFIED: 'Bản đánh giá vừa được sửa ở thiết bị khác. Hãy tải lại dữ liệu mới nhất.',
  PRE_SURVEY_NOT_EDITABLE: 'Bản đánh giá đã gửi nên không thể sửa tiếp.',
  PRE_SURVEY_ALREADY_SUBMITTED: 'Bản đánh giá này đã được gửi trước đó.',
  TECHNICIAN_NOT_ASSIGNED: 'Lịch này không còn được giao cho bạn.',
  APPOINTMENT_NOT_FOUND: 'Không tìm thấy lịch hẹn.',
}

const statusMessages: Record<number, string> = {
  400: 'Dữ liệu gửi lên chưa hợp lệ.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu yêu cầu.',
  409: 'Dữ liệu vừa thay đổi. Hãy tải lại và thử lần nữa.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  500: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  503: 'Máy chủ đang bảo trì. Vui lòng thử lại sau.',
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function isNetworkError(error: unknown) {
  return error instanceof ApiError && error.status === 0
}

type SessionExpiredHandler = () => void
let onSessionExpired: SessionExpiredHandler | null = null
let refreshInFlight: Promise<string> | null = null

export function setSessionExpiredHandler(handler: SessionExpiredHandler | null) {
  onSessionExpired = handler
}

function publicPath(path: string) {
  return path.startsWith('/auth/')
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function unwrap<T>(status: number, body: unknown): T {
  if (body && typeof body === 'object' && 'isSuccess' in body) {
    const envelope = body as ApiEnvelope<T>
    if (envelope.isSuccess === false) {
      const code = envelope.error?.code ?? null
      throw new ApiError(messages[code ?? ''] ?? envelope.error?.message ?? statusMessages[status] ?? 'Đã xảy ra lỗi.', status, code)
    }
    return envelope.data as T
  }
  return body as T
}

async function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= (async () => {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) throw new ApiError(statusMessages[401]!, 401)
    const response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const body = await readBody(response)
    if (!response.ok) throw new ApiError(statusMessages[response.status] ?? statusMessages[401]!, response.status)
    const tokens = unwrap<AuthTokens>(response.status, body)
    await saveTokens(tokens)
    return tokens.accessToken!
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

export async function restoreSessionTokens() {
  return refreshAccessToken()
}

export async function waitForRefresh() {
  await refreshInFlight?.catch(() => undefined)
}

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown; retry?: boolean }

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, retry = true, ...init } = options
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  const token = getAccessToken()
  if (token && !publicPath(path)) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetchWithTimeout(`${API_URL}${path}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.', 0)
  }

  if (response.status === 401 && retry && !publicPath(path) && (await getRefreshToken())) {
    try {
      const nextToken = await refreshAccessToken()
      headers.set('Authorization', `Bearer ${nextToken}`)
      return apiRequest<T>(path, { ...options, headers, retry: false })
    } catch {
      await clearTokens()
      onSessionExpired?.()
      throw new ApiError(statusMessages[401]!, 401)
    }
  }

  const responseBody = await readBody(response)
  if (!response.ok) {
    if (responseBody && typeof responseBody === 'object' && 'isSuccess' in responseBody) {
      return unwrap<T>(response.status, responseBody)
    }
    const raw = responseBody as { code?: unknown; message?: unknown; error?: { code?: unknown; message?: unknown } } | null
    const codeValue = raw?.error?.code ?? raw?.code
    const messageValue = raw?.error?.message ?? raw?.message
    const code = typeof codeValue === 'string' ? codeValue : null
    const message = messages[code ?? ''] ?? (typeof messageValue === 'string' ? messageValue : null) ?? statusMessages[response.status] ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'
    throw new ApiError(message, response.status, code)
  }
  return unwrap<T>(response.status, responseBody)
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path, { method: 'GET' })
}

export function apiPost<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: 'POST', body })
}

export function apiPut<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: 'PUT', body })
}
