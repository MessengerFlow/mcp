import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, errorFromBody, formatWait, parseBody, rateLimitMessage } from './errors.js'

test('uses the API message instead of the error flag', () => {
  const body = JSON.stringify({ error: true, statusCode: 400, message: 'name: Required' })
  assert.equal(errorFromBody(400, body), 'name: Required')
})

test('lists field errors from flattened validation', () => {
  const body = JSON.stringify({
    error: true,
    message: 'Invalid request body',
    data: { formErrors: [], fieldErrors: { email: ['Required'], password: ['Too short'] } },
  })
  assert.equal(errorFromBody(400, body), 'email: Required; password: Too short')
})

test('falls back to the status when the body is not JSON', () => {
  assert.equal(errorFromBody(500, '<html>'), 'Request failed (500)')
})

test('never reports a boolean as the message', () => {
  assert.equal(errorFromBody(500, JSON.stringify({ error: true })), 'Request failed (500)')
})

test('returns CSV and plain text unparsed', () => {
  assert.equal(parseBody('text/csv; charset=utf-8', 'id,name\n1,a\n'), 'id,name\n1,a\n')
  assert.equal(parseBody('text/plain', 'OK'), 'OK')
})

test('parses JSON and treats an empty body as empty', () => {
  assert.deepEqual(parseBody('application/json', '{"a":1}'), { a: 1 })
  assert.deepEqual(parseBody('application/json', ''), {})
})

test('rejects the HTML the app serves for an unknown route', () => {
  assert.throws(() => parseBody('text/html;charset=utf-8', '<!DOCTYPE html>'), ApiError)
})

test('accepts a bare string, which the API sends labelled as HTML', () => {
  assert.equal(parseBody('text/html;charset=utf-8', 'OK'), 'OK')
})

test('reports a daily cap with its own message and the real wait', () => {
  const body = JSON.stringify({
    statusCode: 429,
    message: 'This account has reached 5 group joins in the last 24 hours',
    data: { retryAfter: 30000 },
  })
  assert.equal(
    rateLimitMessage(body, null),
    'This account has reached 5 group joins in the last 24 hours. Try again in 8h 20m.',
  )
})

test('prefers the Retry-After header over the body', () => {
  const body = JSON.stringify({ message: 'Rate limit exceeded (100 requests per minute)', data: { retryAfter: 50 } })
  assert.equal(rateLimitMessage(body, '37'), 'Rate limit exceeded (100 requests per minute). Try again in 37s.')
})

test('adds no wait when the API gives none', () => {
  const body = JSON.stringify({ message: 'Feedback limit reached (10 a day from agents). Try again tomorrow.' })
  assert.equal(rateLimitMessage(body, null), 'Feedback limit reached (10 a day from agents). Try again tomorrow.')
  assert.equal(rateLimitMessage('<html>', null), 'Rate limited')
})

test('formats waits in the largest sensible unit', () => {
  assert.equal(formatWait(1), '1s')
  assert.equal(formatWait(89), '89s')
  assert.equal(formatWait(600), '10 min')
  assert.equal(formatWait(7200), '2h')
  assert.equal(formatWait(86400), '24h')
})
