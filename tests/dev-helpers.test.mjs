import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  emulatorApiUrl,
  freeKb,
  nextFreePort,
  parseAdbDevices,
  pickApiPort,
  pickAvd,
  readEnvValue,
} from '../scripts/dev-helpers.mjs'

test('đọc danh sách thiết bị từ adb devices', () => {
  const output = [
    '* daemon not running; starting now at tcp:5037',
    '* daemon started successfully',
    'List of devices attached',
    'emulator-5554\tdevice',
    'R58N123ABC\tunauthorized',
    'emulator-5556\toffline',
    '',
  ].join('\r\n')
  assert.deepEqual(parseAdbDevices(output), [
    { serial: 'emulator-5554', state: 'device' },
    { serial: 'R58N123ABC', state: 'unauthorized' },
    { serial: 'emulator-5556', state: 'offline' },
  ])
})

test('adb chưa có thiết bị nào thì trả mảng rỗng', () => {
  assert.deepEqual(parseAdbDevices('List of devices attached\n\n'), [])
})

test('Metro bỏ qua cổng của backend và cổng đang bận', () => {
  assert.equal(nextFreePort(8081, new Set()), 8081)
  assert.equal(nextFreePort(8081, new Set([8081])), 8082)
  assert.equal(nextFreePort(8081, new Set([8081, 8082])), 8083)
})

test('chọn cổng backend: cổng có backend trước, rồi tới cổng còn trống', () => {
  assert.equal(
    pickApiPort([
      { port: 8080, status: 'other' },
      { port: 8081, status: 'api' },
    ]),
    8081,
  )
  assert.equal(
    pickApiPort([
      { port: 8080, status: 'api' },
      { port: 8081, status: 'api' },
    ]),
    8080,
  )
  // Backend chưa bật mà 8080 bị chương trình khác chiếm thì dùng 8081
  assert.equal(
    pickApiPort([
      { port: 8080, status: 'other' },
      { port: 8081, status: 'free' },
    ]),
    8081,
  )
  assert.equal(
    pickApiPort([
      { port: 8080, status: 'free' },
      { port: 8081, status: 'free' },
    ]),
    8080,
  )
  assert.equal(
    pickApiPort([
      { port: 8080, status: 'other' },
      { port: 8081, status: 'other' },
    ]),
    8080,
  )
})

test('máy ảo gọi backend trên máy tính qua 10.0.2.2', () => {
  assert.equal(emulatorApiUrl(8081), 'http://10.0.2.2:8081/api')
})

test('đọc một biến trong file .env', () => {
  const text = '# ghi chú\nOTHER=1\nEXPO_PUBLIC_API_URL="http://192.168.1.10:8080/api"\n'
  assert.equal(readEnvValue(text, 'EXPO_PUBLIC_API_URL'), 'http://192.168.1.10:8080/api')
  assert.equal(readEnvValue('# EXPO_PUBLIC_API_URL=http://x\n', 'EXPO_PUBLIC_API_URL'), null)
  assert.equal(readEnvValue('EXPO_PUBLIC_API_URL=\n', 'EXPO_PUBLIC_API_URL'), null)
})

test('mặc định chọn máy ảo dành riêng cho Smart Solar, có ANDROID_AVD thì theo biến đó', () => {
  const avds = ['Medium_Phone_API_36.1', 'Smart_Solar_API_36']
  assert.equal(pickAvd(avds, undefined), 'Smart_Solar_API_36')
  assert.equal(pickAvd(avds, 'Medium_Phone_API_36.1'), 'Medium_Phone_API_36.1')
  assert.equal(pickAvd(['Pixel_7'], undefined), 'Pixel_7')
  assert.equal(pickAvd([], undefined), null)
})

test('đọc dung lượng còn trống từ df -k', () => {
  const output = [
    'Filesystem       1K-blocks    Used Available Use% Mounted on',
    '/dev/block/dm-56   6082144 5816004    266140  96% /data/user/0',
    '',
  ].join('\r\n')
  assert.equal(freeKb(output), 266140)
  assert.equal(freeKb('df: /data: Permission denied'), null)
})
