import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePasswordChangeInput } from '../lib/account-security'

test('account password validation rejects incomplete input', () => {
  assert.equal(validatePasswordChangeInput('', 'new-password', 'new-password'), 'Complete all password fields.')
})

test('account password validation enforces length and confirmation', () => {
  assert.match(validatePasswordChangeInput('old-password', 'short', 'short') || '', /at least 8/)
  assert.equal(validatePasswordChangeInput('old-password', 'new-password', 'different-password'), 'New password and confirmation do not match.')
})

test('account password validation rejects reuse and accepts a valid change', () => {
  assert.equal(validatePasswordChangeInput('same-password', 'same-password', 'same-password'), 'New password must be different from the current password.')
  assert.equal(validatePasswordChangeInput('old-password', 'new-password', 'new-password'), null)
})
