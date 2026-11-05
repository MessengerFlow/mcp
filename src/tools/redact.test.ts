import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redactAccounts } from './redact.js'
import { truncateCsv } from './truncate.js'

const account = {
  id: 'a',
  owned_by: 'u',
  chat_pin: '123456',
  proxyData: { id: 'p', managed: false, username: 'user', password: 'secret', ip: '1.2.3.4', port: 80, error: true },
}

test('strips proxy credentials and the chat pin from a list', () => {
  const text = JSON.stringify(redactAccounts({ success: true, data: [account] }))
  for (const secret of ['secret', 'user', '1.2.3.4', '123456']) assert.ok(!text.includes(secret), secret)
  assert.ok(text.includes('"has_chat_pin":true'))
})

test('handles a single account and an account with no proxy', () => {
  assert.equal(redactAccounts({ data: { ...account, proxyData: null } }).data.proxyData, null)
})

test('short CSV passes through unchanged', () => {
  assert.equal(truncateCsv('id\n1\n'), 'id\n1\n')
})

test('long CSV stops on a row boundary and says how much is missing', () => {
  const out = truncateCsv('id\n1111\n2222\n3333\n', 10)
  assert.ok(out.startsWith('id\n1111'))
  assert.ok(out.includes('of 3 leads'))
})
