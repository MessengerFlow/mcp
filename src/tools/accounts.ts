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
- get_logs: id, optional limit, offset
- add: data { email (email, FB username or phone), password (6+ chars), secret (optional 2FA setup key, 16-39 chars, not a 6-digit code), display_name (optional), chat_pin (optional, 6 digits), proxy (optional, UUID of the user's own proxy) }
- update: id, data { display_name, enabled, password, secret, chat_pin, proxy }
- get_activity: id, optional limit (max 100), offset
- get_profile: id. Returns the wanted profile, what is applied on Facebook, and any pending update.
- update_profile: id, data { bio (max 101 chars), fb_name (max 64 chars), picture, banner }. picture and banner are s3://profiles/ links from upload_media. A worker applies the change to Facebook about 5 minutes later, so check get_profile afterwards.
- get_warming: id. Returns the Nexus warming settings.
- set_warming: id, data { niche (20-500 chars, what the account is about), enabled, like_enabled, like_rate (0-100), emotion (0-100), scroll_enabled, posting_enabled }
- remove_warming: id. Takes the account out of Nexus warming.
- live_session_link: id. Returns the page where the user clears a captcha or login checkpoint in a browser. This cannot be done through MCP.

An account needs attention when banned, invalid_credentials, invalid_2fa, requires_pin, identity_required, error or flagged is true.`

export function registerAccountTools(server: McpServer) {
  server.tool(
    'manage_accounts',
    DESCRIPTION,
    {
      action: z.enum([
        'list', 'get', 'add', 'update', 'delete', 'get_stats', 'get_logs', 'get_activity',
        'get_profile', 'update_profile', 'get_warming', 'set_warming', 'remove_warming', 'live_session_link',
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
          case 'get_profile':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/profile`)
            break
          case 'update_profile':
            if (!id) return failure('Account ID is required')
            result = await api(`/accounts/${id}/profile`, { method: 'PATCH', body: data })
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
