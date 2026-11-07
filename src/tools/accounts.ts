import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { config } from '../config.js'
import { redactAccounts } from './redact.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Add, update and delete Facebook accounts. View account stats and logs.

Actions and their fields:
- list: optional limit, offset
- get, get_stats, delete: id
- get_usage: optional id, leave it out for every account. Returns the last 24 hours of friend requests, cold messages, group joins and scrapes, pending friend requests against the cap, the daily budget, and warnings. Check it before anything that adds volume.
- get_logs: id, optional limit, offset
- add: data { email (email, FB username or phone), password (6+ chars), secret (optional 2FA setup key, 16-39 chars, not a 6-digit code), display_name (optional), chat_pin (optional, 6 digits), proxy (optional, UUID of the user's own proxy) }
- update: id, data { display_name, enabled, password, secret, chat_pin, proxy }
- get_activity: id, optional limit (max 100), offset
- get_setup: id. Returns the account's post and profile plan, the progress of each step, and account_enabled.
- set_setup: id, data { the full plan, see below }. Replaces every step that has not run yet, so start from get_setup and send everything you want to keep, or those steps are cancelled.
- resume_setup: id. Resumes a paused plan.
- cancel_setup: id. Cancels the steps that have not run yet.
- get_warming: id. Returns the Nexus warming settings.
- set_warming: id, data { niche (20-500 chars, what the account is about), enabled, like_enabled, like_rate (0-100), emotion (0-100), scroll_enabled, posting_enabled }
- remove_warming: id. Takes the account out of Nexus warming.
- skip_warmup: id, data { confirm: true }. Ends the warmup hold now, so outreach, scraping and inbox sync start at once. Only when the user asks for it by name, after you tell them the risk: new logins that act straight away are more likely to be restricted. Never on an account with a sign-in or Facebook problem.
- live_session_link: id. Returns the page where the user clears a captcha or login checkpoint in a browser. This cannot be done through MCP.

The setup plan is the only way to publish posts and change a profile: picture, cover, bio, work, education, city and hometown. The Facebook name cannot be changed here. Steps run one at a time, about a day apart, during daytime in the account's proxy location, and only once the account has finished its warmup hold, so a post is not instant. Nothing runs while account_enabled is false, so tell the user to turn the account on. It needs the setup feature on the user's account. Tell the user that adding work or education makes Facebook publish a public update, and so does a new picture or cover. All plan fields are optional: picture and cover (keys from upload_media), bio (max 101 chars), work { company, position } (Facebook needs both), education { school }, city, hometown, posts [{ text (max 2000 chars), image (key from upload_media), audience: 'public' or 'friends' }] (max 10), cleanup (boolean, clears old posts first). A step that already ran is not repeated.

An account needs attention when banned, invalid_credentials, invalid_2fa, requires_pin, identity_required, error or flagged is true.`

export function registerAccountTools(server: McpServer) {
  server.tool(
    'manage_accounts',
    DESCRIPTION,
    {
      action: z.enum([
        'list', 'get', 'add', 'update', 'delete', 'get_stats', 'get_logs', 'get_activity',
        'get_setup', 'set_setup', 'resume_setup', 'cancel_setup',
        'get_warming', 'set_warming', 'remove_warming', 'live_session_link', 'get_usage', 'skip_warmup',
      ]).describe('Action to perform'),
      id: z.guid().optional().describe('Account ID'),
      data: z.record(z.string(), z.unknown()).optional().describe('Fields for the action, listed in the tool description'),
      limit: z.number().optional().describe('Page size, up to 200'),
      offset: z.number().optional().describe('Rows to skip'),
    },
    { title: 'Facebook accounts', destructiveHint: true, openWorldHint: true },
    async ({ action, id, data, limit, offset }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = redactAccounts(await api('/accounts', { params: { limit, offset } }))
            break
          case 'get':
            if (!id) return failure('Account ID is required')
            result = redactAccounts(await api(`/accounts/${id}`))
            break
          case 'add':
            result = await api('/accounts', { method: 'POST', body: data })
            break
          case 'update':
            if (!id) return failure('Account ID is required')
            result = await api('/accounts', { method: 'PATCH', body: { id, ...data } })
            break
          case 'delete':
            if (!id) return failure('Account ID is required')
            result = await api('/accounts', { method: 'DELETE', body: { id } })
            break
          case 'get_stats':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/stats`)
            break
          case 'get_logs':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/logs`, { params: { limit, offset } })
            break
          case 'get_activity':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/activity`, { params: { limit, offset } })
            break
          case 'get_setup':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/setup`)
            break
          case 'set_setup':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/setup`, { method: 'PUT', body: data })
            break
          case 'resume_setup':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/setup/resume`, { method: 'POST' })
            break
          case 'cancel_setup':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/setup`, { method: 'DELETE' })
            break
          case 'get_warming':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/nexus`)
            break
          case 'set_warming':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/nexus`, { method: 'POST', body: data })
            break
          case 'remove_warming':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/nexus`, { method: 'DELETE' })
            break
          case 'get_usage':
            result = await api('/accounts/usage', { params: { id } })
            break
          case 'skip_warmup':
            if (!id) return failure('Account ID is required')
            if (data?.confirm !== true) return failure('Tell the user the risk, then call again with data { confirm: true } once they have asked for it')
            result = await api(`/accounts/${id}/skip-warmup`, { method: 'POST' })
            break
          case 'live_session_link':
            if (!id) return failure('Account ID is required')
            result = {
              url: `${new URL(config.baseUrl).origin}/dashboard/accounts/${id}`,
              instructions: 'Open this page and start a Live Session to clear the captcha or login checkpoint.',
            }
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
