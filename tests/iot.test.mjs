import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  chartPoints,
  chartRuns,
  connectionMeta,
  formatAmps,
  formatReadingTime,
  historySearch,
  iotErrorMessage,
  isMonitoringUnavailable,
  isNoBinding,
  isStale,
  latestPollMs,
  mergeHistory,
  nextHistoryCursor,
  nextLatestPollMs,
  NOT_MEASURED_TEXT,
  pollAfterErrorMs,
  quantityText,
  shiftDay,
  valueRange,
  vnDayEnd,
  vnDayStart,
  vnToday,
} from '../src/lib/iot.ts'

const reading = (id, receivedAt, currentAmps) => ({ readingId: id, deviceId: 'ESP32-001', receivedAt, currentAmps })

// ---------- Nhịp hỏi lại ----------

test('ONLINE hỏi lại theo chu kỳ gửi của thiết bị, mặc định 10 giây', () => {
  assert.equal(latestPollMs('ONLINE', 10), 10_000)
  assert.equal(latestPollMs('ONLINE', undefined), 10_000)
  assert.equal(latestPollMs('ONLINE', 15), 15_000)
})

test('không bao giờ hỏi nhanh hơn 10 giây', () => {
  assert.equal(latestPollMs('ONLINE', 2), 10_000)
  assert.equal(latestPollMs('ONLINE', 0), 10_000)
  assert.equal(latestPollMs('ONLINE', -5), 10_000)
  assert.equal(latestPollMs('ONLINE', Number.NaN), 10_000)
})

test('OFFLINE và NO_DATA giãn ra khoảng 30 giây', () => {
  assert.equal(latestPollMs('OFFLINE', 10), 30_000)
  assert.equal(latestPollMs('NO_DATA', 10), 30_000)
  assert.equal(latestPollMs('OFFLINE', 20), 60_000)
})

test('thiết bị bị khoá, chưa gắn hay chưa biết trạng thái thì không hỏi', () => {
  assert.equal(latestPollMs('DISABLED', 10), false)
  assert.equal(latestPollMs('UNASSIGNED', 10), false)
  assert.equal(latestPollMs(null, 10), false)
})

test('429 chờ theo Retry-After, không nhanh hơn 10 giây; thiếu header thì chờ 60 giây', () => {
  assert.equal(pollAfterErrorMs({ status: 429, retryAfter: 42 }), 42_000)
  assert.equal(pollAfterErrorMs({ status: 429, retryAfter: 1 }), 10_000)
  assert.equal(pollAfterErrorMs({ status: 429, retryAfter: null }), 60_000)
})

test('lỗi 4xx khác thì dừng hỏi', () => {
  for (const status of [400, 401, 403, 404]) assert.equal(pollAfterErrorMs({ status }), false, String(status))
})

test('mất mạng hay 5xx thì hỏi thưa lại, theo Retry-After nếu có', () => {
  assert.equal(pollAfterErrorMs({ status: 0 }), 30_000)
  assert.equal(pollAfterErrorMs({ status: 503, retryAfter: 45 }), 45_000)
  assert.equal(pollAfterErrorMs({ status: 500 }), 30_000)
})

test('công trình không còn thiết bị (data null) thì dừng; chưa có dữ liệu thì chưa hẹn', () => {
  assert.equal(nextLatestPollMs({ status: 'success', data: null }, 10), false)
  assert.equal(nextLatestPollMs({ status: 'pending', data: undefined }, 10), false)
  assert.equal(nextLatestPollMs({ status: 'success', data: { connectionStatus: 'ONLINE' } }, 10), 10_000)
  assert.equal(nextLatestPollMs({ status: 'success', data: { connectionStatus: 'DISABLED' } }, 10), false)
  assert.equal(
    nextLatestPollMs({ status: 'error', data: { connectionStatus: 'ONLINE' }, error: { status: 404 } }, 10),
    false,
  )
})

test('số đo cũ hơn ngưỡng mất kết nối không còn là số hiện tại', () => {
  const now = Date.parse('2026-11-20T07:00:40Z')
  assert.equal(isStale('2026-11-20T07:00:30Z', 30, now), false)
  assert.equal(isStale('2026-11-20T07:00:05Z', 30, now), true)
  assert.equal(isStale('không phải ngày', 30, now), true)
})

// ---------- Hiện số ----------

test('dòng điện giữ đúng dấu và mọi chữ số thập phân', () => {
  assert.equal(formatAmps(0.2145), '0,2145 A')
  assert.equal(formatAmps(-0.2145), '-0,2145 A')
  assert.equal(formatAmps(-12.5), '-12,5 A')
  assert.equal(formatAmps(-0.123456789), '-0,123456789 A')
  assert.equal(formatAmps(30), '30 A')
  assert.equal(formatAmps(0), '0 A')
  assert.equal(formatAmps(-0.0000001), '-0,0000001 A')
})

test('đại lượng NOT_AVAILABLE hiện "Chưa đo được", không bao giờ là 0', () => {
  assert.equal(quantityText({ status: 'NOT_AVAILABLE', value: null, unit: 'W' }), NOT_MEASURED_TEXT)
  assert.equal(quantityText({ status: 'NOT_AVAILABLE', value: null, unit: 'kWh' }), NOT_MEASURED_TEXT)
  assert.equal(quantityText({ status: 'MEASURED', value: null, unit: 'W' }), NOT_MEASURED_TEXT)
  assert.equal(quantityText(null), NOT_MEASURED_TEXT)
  assert.equal(quantityText(undefined), NOT_MEASURED_TEXT)
  assert.equal(quantityText({ status: 'MEASURED', value: -0.5, unit: 'A' }), '-0,5 A')
})

test('nhãn trạng thái kết nối giống web', () => {
  assert.equal(connectionMeta('ONLINE').label, 'Đang kết nối')
  assert.equal(connectionMeta('OFFLINE').label, 'Mất kết nối')
  assert.equal(connectionMeta('NO_DATA').label, 'Chưa có số đo')
  assert.equal(connectionMeta('DISABLED').label, 'Thiết bị bị khoá')
  assert.notEqual(connectionMeta('SOMETHING_NEW').label, 'SOMETHING_NEW')
})

test('giờ đo theo giờ Việt Nam, có giây', () => {
  assert.equal(formatReadingTime('2026-11-15T07:00:10.1234567+00:00'), '14:00:10 15/11/2026')
  assert.equal(formatReadingTime('2026-11-15T17:30:05Z'), '00:30:05 16/11/2026')
  assert.equal(formatReadingTime(null), '—')
})

// ---------- Lịch sử ----------

test('gộp trang lịch sử theo readingId, giữ thứ tự mới nhất trước', () => {
  const page1 = { items: [reading('c', '2026-11-20T07:00:30Z', 1), reading('b', '2026-11-20T07:00:20Z', 2)] }
  const page2 = { items: [reading('b', '2026-11-20T07:00:20Z', 2), reading('a', '2026-11-20T07:00:10Z', 3)] }
  assert.deepEqual(
    mergeHistory([page1, page2]).map((r) => r.readingId),
    ['c', 'b', 'a'],
  )
  assert.deepEqual(mergeHistory([]), [])
})

test('điểm biểu đồ xếp tăng dần theo thời gian thật, chỉ gồm điểm backend trả', () => {
  const points = chartPoints([
    reading('c', '2026-11-20T07:00:30Z', -1.5),
    reading('a', '2026-11-20T07:00:10Z', 0.25),
    reading('b', '2026-11-20T07:00:20Z', 0),
  ])
  assert.deepEqual(
    points.map((p) => p.readingId),
    ['a', 'b', 'c'],
  )
  assert.deepEqual(
    points.map((p) => p.currentAmps),
    [0.25, 0, -1.5],
  )
  assert.equal(points[0].at, Date.parse('2026-11-20T07:00:10Z'))
})

test('khoảng thiếu số đo không được nối, cũng không thêm điểm', () => {
  const points = chartPoints([
    reading('a', '2026-11-20T07:00:00Z', 1),
    reading('b', '2026-11-20T07:00:10Z', 1),
    reading('c', '2026-11-20T07:05:00Z', 1),
    reading('d', '2026-11-20T07:05:10Z', 1),
  ])
  const runs = chartRuns(points, 30_000)
  assert.deepEqual(
    runs.map((run) => run.map((p) => p.readingId)),
    [
      ['a', 'b'],
      ['c', 'd'],
    ],
  )
  assert.equal(runs.flat().length, points.length)
})

test('trục dọc luôn gồm 0 để thấy số âm', () => {
  assert.deepEqual(valueRange(chartPoints([reading('a', '2026-11-20T07:00:00Z', -2)])), { min: -2, max: 0 })
  assert.deepEqual(valueRange(chartPoints([reading('a', '2026-11-20T07:00:00Z', 3)])), { min: 0, max: 3 })
})

test('nextBefore gửi lại nguyên văn làm before và được mã hoá', () => {
  const nextBefore = '2026-11-15T06:43:20.1234567+00:00'
  const cursor = nextHistoryCursor({ hasMore: true, nextBefore })
  assert.equal(cursor, nextBefore)
  const search = historySearch({ before: cursor, limit: 100 })
  assert.equal(search, '?before=2026-11-15T06%3A43%3A20.1234567%2B00%3A00&limit=100')
  assert.equal(new URLSearchParams(search).get('before'), nextBefore)
  assert.equal(nextHistoryCursor({ hasMore: false, nextBefore: null }), undefined)
})

test('lọc theo ngày gửi from / to theo giờ Việt Nam', () => {
  const search = new URLSearchParams(historySearch({ from: vnDayStart('2026-11-19'), to: vnDayEnd('2026-11-19') }))
  assert.equal(search.get('from'), '2026-11-19T00:00:00+07:00')
  assert.equal(search.get('to'), '2026-11-19T23:59:59.999+07:00')
  assert.equal(search.get('limit'), '100')
  assert.equal(vnToday(Date.parse('2026-11-19T17:30:00Z')), '2026-11-20')
  assert.equal(shiftDay('2026-11-30', 1), '2026-12-01')
})

// ---------- Lỗi ----------

test('IOT_BINDING_NOT_FOUND là trạng thái chưa gắn, không phải lỗi', () => {
  assert.equal(isNoBinding({ status: 404, code: 'IOT_BINDING_NOT_FOUND' }), true)
  assert.equal(isNoBinding({ status: 404, code: 'INSTALLATION_PROJECT_NOT_FOUND' }), false)
})

test('mỗi mã lỗi có câu tiếng Việt riêng', () => {
  assert.equal(iotErrorMessage({ status: 404, code: 'INSTALLATION_PROJECT_NOT_FOUND' }), 'Không tìm thấy công trình.')
  assert.match(iotErrorMessage({ status: 403, code: 'AUTH_FORBIDDEN' }), /không phải tài khoản khách hàng/)
  assert.match(iotErrorMessage({ status: 400, code: 'IOT_VALIDATION_FAILED' }), /Khoảng ngày hoặc số dòng/)
  assert.match(iotErrorMessage({ status: 429, code: 'AUTH_TOO_MANY_REQUESTS', retryAfter: 17 }), /17 giây/)
  assert.match(iotErrorMessage({ status: 0, code: null }), /Mất kết nối mạng/)
  for (const code of ['FEATURE_PENDING_MIGRATION', 'SCHEMA_NOT_READY', 'IOT_STORAGE_UNAVAILABLE']) {
    assert.equal(isMonitoringUnavailable({ status: 503, code }), true, code)
    assert.match(iotErrorMessage({ status: 503, code }), /Chưa xem được số đo/, code)
  }
})
