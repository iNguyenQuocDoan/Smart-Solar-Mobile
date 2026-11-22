import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isStrongPassword, passwordErrors } from '../src/lib/auth/password.ts'

test('mật khẩu mới đủ 4 quy tắc như web, nhập lại phải khớp', () => {
  assert.equal(isStrongPassword('Abcdef1!'), true)
  assert.equal(isStrongPassword('abcdef1!'), false)
  assert.equal(isStrongPassword('Abcdefg!'), false)
  assert.equal(isStrongPassword('Abc1!'), false)
  assert.deepEqual(passwordErrors({ current: 'x', next: 'Abcdef1!', confirm: 'Abcdef1!' }), {})
  assert.deepEqual(Object.keys(passwordErrors({ current: '', next: 'abc', confirm: 'abd' })), [
    'current',
    'next',
    'confirm',
  ])
})
