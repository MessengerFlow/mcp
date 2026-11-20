import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runBrowserAction, type BrowserDeps } from './browser.js'
import { ApiError } from '../errors.js'

const ID = '11111111-2222-3333-4444-555555555555'
const LINK = `https://app.test/dashboard/accounts/${ID}`

function fakeDeps(responses: Array<unknown | Error>) {
  const calls: Array<{ path: string; options: any }> = []
  let clock = 0
  const deps: BrowserDeps = {
    api: (async (path: string, options: any = {}) => {
      calls.push({ path, options })
      const next = responses.shift()
      if (next instanceof Error) throw next
      return { success: true, data: next }
    }) as any,
    sleep: async ms => { clock += ms },
    now: () => clock,
  }
  return { deps, calls }
}

const textOf = (result: any) => result.content[0].text

test('snapshot returns the page text and the screenshot as an image part', async () => {
  const { deps, calls } = fakeDeps([{ text: 'url: https://www.facebook.com/\n[e1] link "Home" -> /', screenshot: 'aGVsbG8=', expires_in_seconds: 800 }])
  const result: any = await runBrowserAction('snapshot', ID, {}, deps)

  assert.equal(result.isError, undefined)
  assert.equal(result.content.length, 2)
  assert.match(textOf(result), /\[e1\] link "Home"/)
  assert.match(textOf(result), /800 seconds left/)
  assert.deepEqual(result.content[1], { type: 'image', data: 'aGVsbG8=', mimeType: 'image/jpeg' })
  assert.deepEqual(calls[0], { path: `/accounts/${ID}/browser/act`, options: { method: 'POST', body: { action: 'snapshot', screenshot: true, full_page: false } } })
})

test('screenshot false sends no image part', async () => {
  const { deps, calls } = fakeDeps([{ text: 'url: x', expires_in_seconds: 10 }])
  const result: any = await runBrowserAction('snapshot', ID, { screenshot: false, full_page: true }, deps)
  assert.equal(result.content.length, 1)
  assert.deepEqual(calls[0].options.body, { action: 'snapshot', screenshot: false, full_page: true })
})

test('a failed screenshot is mentioned next to the text', async () => {
  const { deps } = fakeDeps([{ text: 'url: x', screenshot_error: 'The screenshot could not be taken.' }])
  const result: any = await runBrowserAction('snapshot', ID, {}, deps)
  assert.equal(result.content.length, 1)
  assert.match(textOf(result), /could not be taken/)
})

test('navigate needs a url and sends it', async () => {
  const empty = fakeDeps([])
  const refused: any = await runBrowserAction('navigate', ID, {}, empty.deps)
  assert.equal(refused.isError, true)
  assert.equal(empty.calls.length, 0)

  const { deps, calls } = fakeDeps([{ text: 'url: https://www.facebook.com/groups/1' }])
  await runBrowserAction('navigate', ID, { url: 'https://www.facebook.com/groups/1' }, deps)
  assert.deepEqual(calls[0].options.body, { action: 'navigate', url: 'https://www.facebook.com/groups/1', screenshot: true })
})

test('start polls status until the browser is ready', async () => {
  const { deps, calls } = fakeDeps([{ state: 'starting' }, { state: 'starting' }, { state: 'ready', url: 'https://www.facebook.com/' }])
  const result: any = await runBrowserAction('start', ID, {}, deps)
  assert.equal(result.isError, undefined)
  assert.equal(JSON.parse(textOf(result)).state, 'ready')
  assert.deepEqual(calls.map(c => c.options.method ?? 'GET'), ['POST', 'GET', 'GET'])
})

test('start gives up waiting after about 25 seconds and says to call status', async () => {
  const { deps, calls } = fakeDeps(Array.from({ length: 20 }, () => ({ state: 'starting' })))
  const result: any = await runBrowserAction('start', ID, {}, deps)
  const body = JSON.parse(textOf(result))
  assert.equal(body.state, 'starting')
  assert.match(body.next, /status again/)
  assert.ok(calls.length >= 8 && calls.length <= 10, String(calls.length))
})

test('a checkpoint while starting is an error with the Live Session link', async () => {
  const { deps } = fakeDeps([{ state: 'starting' }, { state: 'ended', code: 'CHECKPOINT', message: 'Facebook showed a login check.', live_session_link: LINK }])
  const result: any = await runBrowserAction('start', ID, {}, deps)
  assert.equal(result.isError, true)
  assert.equal(textOf(result), `Error: CHECKPOINT: Facebook showed a login check. Live Session: ${LINK}`)
})

test('status reports a checkpoint as an error and other ends as data', async () => {
  const checkpoint = fakeDeps([{ state: 'ended', code: 'CHECKPOINT', message: 'Login check.', live_session_link: LINK }])
  const failed: any = await runBrowserAction('status', ID, {}, checkpoint.deps)
  assert.equal(failed.isError, true)
  assert.match(textOf(failed), new RegExp(LINK))

  const idle = fakeDeps([{ state: 'ended', code: 'SESSION_ENDED', ended_reason: 'idle' }])
  const ended: any = await runBrowserAction('status', ID, {}, idle.deps)
  assert.equal(ended.isError, undefined)
  assert.equal(JSON.parse(textOf(ended)).ended_reason, 'idle')
})

test('API errors keep their code so agents can branch on it', async () => {
  const { deps } = fakeDeps([new ApiError(400, 'NOT_ALLOWED_URL: Only facebook.com and messenger.com pages can be opened.')])
  await assert.rejects(runBrowserAction('navigate', ID, { url: 'https://example.com' }, deps), /^ApiError: NOT_ALLOWED_URL/)
})

test('end closes the session with DELETE', async () => {
  const { deps, calls } = fakeDeps([{ ended: true, duration_seconds: 120, snapshots: 3, navigations: 2 }])
  const result: any = await runBrowserAction('end', ID, {}, deps)
  assert.equal(JSON.parse(textOf(result)).ended, true)
  assert.deepEqual(calls[0], { path: `/accounts/${ID}/browser`, options: { method: 'DELETE' } })
})
