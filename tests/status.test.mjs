import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  appointmentStatus,
  assignmentSourceLabel,
  canBook,
  coverageText,
  customerStatus,
  historyStatusLabel,
  ineligibleLabel,
} from '../src/lib/status.ts'

const STATUSES = ['PENDING_ACCEPTANCE', 'ESCALATED', 'ACCEPTED', 'ASSIGNED', 'COMPLETED', 'CANCELLED']

test('mọi trạng thái lịch hẹn đều có nhãn tiếng Việt, không hiện mã', () => {
  for (const viewer of ['customer', 'technician']) {
    for (const status of STATUSES) {
      assert.notEqual(appointmentStatus(status, viewer).label, status, `${viewer} ${status}`)
    }
  }
})

test('mã trạng thái lạ không lộ ra giao diện', () => {
  assert.notEqual(appointmentStatus('SOMETHING_NEW', 'technician').label, 'SOMETHING_NEW')
})

test('kỹ thuật viên thấy lịch chờ nhận là việc cần làm', () => {
  assert.equal(appointmentStatus('PENDING_ACCEPTANCE', 'technician').tone, 'danger')
  assert.equal(appointmentStatus('ACCEPTED', 'technician').label, 'Bạn đã nhận')
})

test('khách thấy trạng thái theo acceptanceStatus', () => {
  const waiting = { status: 'PENDING_ACCEPTANCE', acceptanceStatus: 'WAITING_FOR_TECHNICIAN' }
  assert.equal(customerStatus({ status: 'PENDING', appointment: waiting }).label, 'Đã đặt giờ, chờ kỹ thuật viên nhận')
  const confirmed = { status: 'ACCEPTED', acceptanceStatus: 'CONFIRMED' }
  assert.equal(customerStatus({ status: 'SCHEDULED', appointment: confirmed }).label, 'Kỹ thuật viên đã nhận lịch')
})

test('chỉ đặt giờ được khi yêu cầu đang chờ và chưa có lịch', () => {
  assert.equal(canBook({ status: 'PENDING', appointment: null }), true)
  assert.equal(canBook({ status: 'SCHEDULED', appointment: null }), false)
  const waiting = { status: 'PENDING_ACCEPTANCE', acceptanceStatus: 'WAITING_FOR_TECHNICIAN' }
  assert.equal(canBook({ status: 'PENDING', appointment: waiting }), false)
})

test('lịch sử đặt giờ: lần huỷ gộp chung với đổi giờ', () => {
  assert.equal(historyStatusLabel('CANCELLED'), 'Đã huỷ hoặc đổi giờ')
  assert.equal(historyStatusLabel('PENDING_ACCEPTANCE'), 'Chờ kỹ thuật viên nhận')
})

test('lý do ngày không có giờ trống và lý do không nhận được lịch', () => {
  assert.match(coverageText('NO_ZONE_TECHNICIAN') ?? '', /chưa có kỹ thuật viên/)
  assert.equal(coverageText('COVERED'), null)
  assert.equal(ineligibleLabel('DAILY_LIMIT_REACHED'), 'đã đủ số lịch trong ngày')
  assert.equal(assignmentSourceLabel('SELF_ACCEPTED'), 'Bạn tự nhận')
})
