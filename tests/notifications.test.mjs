import assert from 'node:assert/strict'
import { test } from 'node:test'
import { notificationLabel, notificationTarget } from '../src/lib/notifications.ts'

test('thông báo: nhãn tiếng Việt theo loại, mở màn có trong app', () => {
  assert.equal(notificationLabel('SURVEY_APPOINTMENT_CONFIRMED'), 'Đã có kỹ thuật viên nhận lịch khảo sát')
  assert.equal(notificationLabel('SOMETHING_NEW'), 'Có cập nhật mới')
  assert.equal(notificationTarget('SURVEY_APPOINTMENT_RESCHEDULED'), '/customer/requests')
  assert.equal(notificationTarget('INSTALLATION_STARTED'), '/customer')
  assert.equal(notificationTarget('INSTALLATION_SCHEDULE_CHANGED'), null)
  assert.equal(notificationTarget('CONTRACT_BALANCE_DUE'), null)
  assert.equal(notificationTarget('PACKAGE_EXPIRING'), null)
})
