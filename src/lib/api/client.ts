import { Platform } from 'react-native'
import type { AuthTokens } from '@/lib/api/types'
import { ApiError, apiErrorFrom, NETWORK_ERROR_MESSAGE, sessionExpiredError, unwrapResponse } from '@/lib/api/errors'
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/lib/auth/tokenStorage'

const fallbackUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080/api' : 'http://localhost:8080/api'
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? fallbackUrl
const REQUEST_TIMEOUT_MS = 15_000

export { ApiError, isNetworkError } from '@/lib/api/errors'

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

/** Network failure, rate limit or server error: the refresh token may still be good, so the session is kept */
const isTransient = (error: unknown) =>
  error instanceof ApiError && (error.status === 0 || error.status === 429 || error.status >= 500)

async function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= (async () => {
    const refreshToken = await getRefreshToken()
    if (!refreshToken) throw sessionExpiredError()
    let response: Response
    try {
      response = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0)
    }
    const body = await readBody(response)
    if (!response.ok) {
      const error = apiErrorFrom(response.status, body, response.headers.get('Retry-After'))
      throw isTransient(error) ? error : sessionExpiredError()
    }
    const tokens = unwrapResponse<AuthTokens>(response.status, body)
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
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0)
  }

  if (response.status === 401 && retry && !publicPath(path) && (await getRefreshToken())) {
    let nextToken: string
    try {
      // Many requests can fail together: all of them share one refresh, and a request that failed after the token was
      // already renewed just retries with the new one
      const current = getAccessToken()
      nextToken = current && current !== token ? current : await refreshAccessToken()
    } catch (error) {
      if (isTransient(error)) throw error
      await clearTokens()
      onSessionExpired?.()
      throw sessionExpiredError()
    }
    headers.set('Authorization', `Bearer ${nextToken}`)
    return apiRequest<T>(path, { ...options, headers, retry: false })
  }

  const responseBody = await readBody(response)
  return unwrapResponse<T>(response.status, responseBody, response.headers.get('Retry-After'))
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

export function apiDelete<T>(path: string) {
  return apiRequest<T>(path, { method: 'DELETE' })
}
