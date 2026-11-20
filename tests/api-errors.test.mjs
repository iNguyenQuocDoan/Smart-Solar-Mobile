import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError, apiErrorFrom, isNetworkError, parseRetryAfter, unwrapResponse } from '../src/lib/api/errors.ts'

const envelope = (data) => ({ isSuccess: true, traceId: 't', data, error: null })
const failure = (code, message = 'English message', fieldErrors = null) => ({
  isSuccess: false,
  traceId: 't',
  data: null,
  error: { code, message, details: null, fieldErrors },
})

test('mở data của envelope thành công', () => {
  assert.deepEqual(unwrapResponse(200, envelope({ connectionStatus: 'ONLINE', reading: null })), {
    connectionStatus: 'ONLINE',
    reading: null,
  })
  assert.equal(unwrapResponse(204, null), null)
})

test('lỗi thành ApiError có status, code, câu tiếng Việt và retryAfter', () => {
  const error = (() => {
    try {
      unwrapResponse(429, failure('AUTH_TOO_MANY_REQUESTS'), '30')
    } catch (e) {
      return e
    }
  })()
  assert.ok(error instanceof ApiError)
  assert.equal(error.status, 429)
  assert.equal(error.code, 'AUTH_TOO_MANY_REQUESTS')
  assert.equal(error.retryAfter, 30)
  assert.doesNotMatch(error.message, /Too many/)
})

test('mã lỗi IoT có câu tiếng Việt, không lộ câu tiếng Anh của backend', () => {
  for (const [status, code] of [
    [404, 'INSTALLATION_PROJECT_NOT_FOUND'],
    [404, 'IOT_BINDING_NOT_FOUND'],
    [400, 'IOT_VALIDATION_FAILED'],
    [403, 'AUTH_FORBIDDEN'],
    [503, 'FEATURE_PENDING_MIGRATION'],
    [503, 'SCHEMA_NOT_READY'],
    [503, 'IOT_STORAGE_UNAVAILABLE'],
  ]) {
    const error = apiErrorFrom(status, failure(code))
    assert.equal(error.status, status)
    assert.equal(error.code, code)
    assert.notEqual(error.message, 'English message', code)
  }
})

test('fieldErrors được giữ lại', () => {
  const error = apiErrorFrom(400, failure('IOT_VALIDATION_FAILED', 'x', { limit: ["'limit' must be 1-500."] }))
  assert.deepEqual(error.fieldErrors, { limit: ["'limit' must be 1-500."] })
})

test('envelope isSuccess false dù HTTP 200 vẫn là lỗi', () => {
  assert.throws(
    () => unwrapResponse(200, failure('AUTH_FORBIDDEN')),
    (e) => e instanceof ApiError && e.code === 'AUTH_FORBIDDEN',
  )
})

test('response lỗi không phải envelope vẫn thành ApiError theo status', () => {
  assert.throws(
    () => unwrapResponse(502, null),
    (e) => e instanceof ApiError && e.status === 502,
  )
})

test('Retry-After nhận số giây hoặc ngày HTTP', () => {
  assert.equal(parseRetryAfter('60'), 60)
  assert.equal(parseRetryAfter(' 5 '), 5)
  const now = Date.parse('2026-11-20T07:00:00Z')
  assert.equal(parseRetryAfter('Fri, 20 Nov 2026 07:00:45 GMT', now), 45)
  assert.equal(parseRetryAfter(null), null)
  assert.equal(parseRetryAfter('abc'), null)
})

test('status 0 là mất mạng', () => {
  assert.equal(isNetworkError(new ApiError('x', 0)), true)
  assert.equal(isNetworkError(new ApiError('x', 500)), false)
})
