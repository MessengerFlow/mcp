import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success, successWithImage } from './result.js'

const DESCRIPTION = `Open a browser signed in as one of the user's Facebook accounts, look at pages and move between them. Use it only when no other tool covers the task, for example to read a profile, a group or the Messenger inbox as the account sees it. It is a closed beta: it works only when limits.browserAgent is true in manage_settings get_plan.

Actions, each with id (the account id):
- start: signs the account in. Takes 30 seconds to a few minutes. Returns state 'ready', or 'starting' with a note to call status again.
- status: the state ('starting', 'ready', 'ended' or 'none'), the current page and the seconds left.
- snapshot: optional data { screenshot (default true), full_page (default false) }. A screenshot plus the visible text, headings, links, buttons and inputs of the page. Elements carry refs like [e12] that stay the same while the page stays open. full_page also lists what is below the visible part.
- navigate: data { url, screenshot (default true) }. Opens an https page on facebook.com or messenger.com and returns its snapshot. Settings, password, security, payment, ads, login, checkpoint and encrypted chat pages are blocked, and so is every other site.
- end: closes the browser. Always end the session as soon as you are done.

It cannot click, type, scroll, send messages, post, add friends or join groups, so the refs are only for describing the page for now. It never runs JavaScript you supply and never returns cookies, passwords or a link to watch the browser. Use the other tools to act.

Limits: one session at a time per MessengerFlow user, 6 sessions and 60 browser minutes per Facebook account in any 24 hours, a session ends after 5 minutes without a call and after 15 minutes in total, at most 40 pages per session, and pages open a few seconds apart. While a session runs, campaigns and other work on that account wait. Errors start with a code: CAPACITY, DAILY_LIMIT and ACCOUNT_BUSY mean try again later; ACCOUNT_NOT_READY and WARMING_UP mean the account cannot be used now, so do not retry; NOT_ALLOWED_URL means the page is off limits.

If the account hits a captcha or login check, the session ends with CHECKPOINT and a Live Session link. Stop, tell the user what happened and give them the link so they can sign in themselves. Do not try to get past it. The user opening a Live Session on the account also ends the agent session.`

const START_WAIT_MS = 25_000
const POLL_INTERVAL_MS = 3_000

export interface BrowserDeps {
  api: typeof api
  sleep: (ms: number) => Promise<void>
  now: () => number
}

const defaultDeps: BrowserDeps = {
  api,
  sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
  now: () => Date.now(),
}

export type BrowserAction = 'start' | 'status' | 'snapshot' | 'navigate' | 'end'

export interface BrowserData {
  url?: string
  screenshot?: boolean
  full_page?: boolean
}

function unwrap(response: any) {
  return response?.data ?? response ?? {}
}

function endedFailure(status: any) {
  const code = status.code ?? 'SESSION_ENDED'
  const message = status.message ?? 'The session ended.'
  const link = status.live_session_link ? ` Live Session: ${status.live_session_link}` : ''
  return failure(`${code}: ${message}${link}`)
}

function snapshotResult(result: any) {
  const notes = [`[session: ${result.expires_in_seconds ?? '?'} seconds left]`]
  if (result.screenshot_error) notes.push(`[${result.screenshot_error}]`)
  return successWithImage(`${result.text ?? ''}\n\n${notes.join('\n')}`, result.screenshot || undefined)
}

export async function runBrowserAction(action: BrowserAction, id: string, data: BrowserData = {}, deps: BrowserDeps = defaultDeps) {
  const path = `/accounts/${id}/browser`

  switch (action) {
    case 'start': {
      let status = unwrap(await deps.api(path, { method: 'POST' }))
      const deadline = deps.now() + START_WAIT_MS
      while (status.state === 'starting' && deps.now() < deadline) {
        await deps.sleep(POLL_INTERVAL_MS)
        status = unwrap(await deps.api(path))
      }
      if (status.state === 'ended') return endedFailure(status)
      if (status.state === 'starting') {
        return success({ ...status, next: 'The browser is still signing in. Call status again in about 15 seconds.' })
      }
      return success(status)
    }
    case 'status': {
      const status = unwrap(await deps.api(path))
      if (status.state === 'ended' && status.code === 'CHECKPOINT') return endedFailure(status)
      return success(status)
    }
    case 'snapshot':
      return snapshotResult(unwrap(await deps.api(`${path}/act`, {
        method: 'POST',
        body: { action: 'snapshot', screenshot: data.screenshot ?? true, full_page: data.full_page ?? false },
      })))
    case 'navigate':
      if (!data.url) return failure('data.url is required, an https address on facebook.com or messenger.com')
      return snapshotResult(unwrap(await deps.api(`${path}/act`, {
        method: 'POST',
        body: { action: 'navigate', url: data.url, screenshot: data.screenshot ?? true },
      })))
    case 'end':
      return success(unwrap(await deps.api(path, { method: 'DELETE' })))
  }
}

export function registerBrowserTools(server: McpServer) {
  server.tool(
    'manage_browser',
    DESCRIPTION,
    {
      action: z.enum(['start', 'status', 'snapshot', 'navigate', 'end']).describe('Action to perform'),
      id: z.guid().describe('Account ID'),
      data: z.object({
        url: z.string().optional().describe('navigate: https address on facebook.com or messenger.com'),
        screenshot: z.boolean().optional().describe('snapshot, navigate: include a screenshot (default true)'),
        full_page: z.boolean().optional().describe('snapshot: list the whole page, not only the visible part (default false)'),
      }).optional().describe('Fields for the action, listed in the tool description'),
    },
    { title: 'Account browser', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    async ({ action, id, data }) => {
      try {
        return await runBrowserAction(action, id, data)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
