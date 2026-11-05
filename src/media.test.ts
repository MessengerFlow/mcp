import { test } from 'node:test'
import assert from 'node:assert/strict'
import { downloadMedia, isPrivateAddress, parseMediaUrl } from './media.js'

test('treats internal addresses as private', () => {
  for (const address of [
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
  ]) {
    assert.equal(isPrivateAddress(address), true, address)
  }
})

test('allows public addresses', () => {
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
    assert.equal(isPrivateAddress(address), false, address)
  }
})

test('treats anything that is not an address as private', () => {
  assert.equal(isPrivateAddress('not-an-ip'), true)
})

test('only accepts https links without credentials', () => {
  assert.throws(() => parseMediaUrl('http://example.com/a.png'), /https/)
  assert.throws(() => parseMediaUrl('file:///etc/passwd'), /https/)
  assert.throws(() => parseMediaUrl('nonsense'), /https/)
  assert.throws(() => parseMediaUrl('https://user:pass@example.com/a.png'), /username/)
  assert.ok(parseMediaUrl('https://example.com/a.png'))
})

test('rejects a link that points straight at an internal address', () => {
  assert.throws(() => parseMediaUrl('https://127.0.0.1/a.png'), /not allowed/)
  assert.throws(() => parseMediaUrl('https://[::1]/a.png'), /not allowed/)
  assert.throws(() => parseMediaUrl('https://169.254.169.254/latest/meta-data'), /not allowed/)
})

test('refuses a hostname that resolves to an internal address', async () => {
  await assert.rejects(downloadMedia('https://localhost/a.png'), /not allowed/)
})
