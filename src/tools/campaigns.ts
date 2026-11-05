import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Create, update, start, stop and delete campaigns. View campaign leads and activity. Manage campaign accounts.

Actions and their fields:
- list: optional limit, offset, search (campaign name)
- get, start, stop, delete: id
- get_count: no fields
- get_leads: id, optional limit (max 100), offset, search, status
- get_activity: id, optional limit (max 50)
- add_account, remove_account: id, account_id
- update: id, data with any create field except collection and accounts
- create: data {
    name (max 50 chars), collection (lead collection UUID, must be finished and contain leads),
    accounts (array of account UUIDs), messages (1-5 strings, max 2500 chars each),
    range_min, range_max (messages per account per day, 1-75),
    rampup_type ('disabled', 'incremental' or 'staged'; staged needs rampup_stages [{ start, end, value }]),
    timezone (IANA name such as America/New_York),
    active_days (1 = Monday through 7 = Sunday),
    send_friend_requests (boolean),
    optional: active_hours [{ start: 'HH:MM', end: 'HH:MM' }], rampup_increment and rampup_increment_max (1-20),
    follow_ups [{ message, send_after (days, 0-90) }] (max 10), send_on_accept (boolean, wait for the friend request to be accepted),
    friend_request_ttl_days (3-14)
  }

Every lead receives every entry in messages, in order, so entries are consecutive parts of one conversation and not alternatives. For variation use spintax inside a message: {Hi|Hello}. Variables: {{first}}, {{last}}, {{name}}, {{id}}.

Campaigns are created paused. Nothing is sent until the start action runs.`

export function registerCampaignTools(server: McpServer) {
  server.tool(
    'manage_campaigns',
    DESCRIPTION,
    {
      action: z.enum([
        'list', 'get', 'create', 'update', 'start', 'stop', 'delete',
        'get_leads', 'get_activity', 'get_count', 'add_account', 'remove_account',
      ]).describe('Action to perform'),
      id: z.guid().optional().describe('Campaign ID'),
      data: z.record(z.string(), z.unknown()).optional().describe('Fields for create/update, listed in the tool description'),
      account_id: z.guid().optional().describe('Account ID for add_account/remove_account'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Rows to skip'),
      search: z.string().optional().describe('Search query'),
      status: z.string().optional().describe('Lead status filter for get_leads'),
    },
    { title: 'Campaigns', destructiveHint: true, openWorldHint: true },
    async ({ action, id, data, account_id, limit, offset, search, status }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = await api('/campaigns', { params: { limit, offset, search } })
            break
          case 'get':
            if (!id) return failure('Campaign ID is required')
            result = await api(`/campaigns/${id}`)
            break
          case 'create':
            result = await api('/campaigns', { method: 'POST', body: { paused: true, ...data } })
            break
          case 'update':
            if (!id) return failure('Campaign ID is required')
            result = await api('/campaigns', { method: 'PATCH', body: { id, ...data } })
            break
          case 'start':
            if (!id) return failure('Campaign ID is required')
            result = await api('/campaigns', { method: 'PATCH', body: { id, paused: false } })
            break
          case 'stop':
            if (!id) return failure('Campaign ID is required')
            result = await api('/campaigns', { method: 'PATCH', body: { id, paused: true } })
            break
          case 'delete':
            if (!id) return failure('Campaign ID is required')
            await api('/campaigns/destroy', { method: 'POST', body: { id } })
            result = { success: true, deleted: id }
            break
          case 'get_leads':
            if (!id) return failure('Campaign ID is required')
            result = await api(`/campaigns/${id}/leads`, { params: { limit, offset, search, status } })
            break
          case 'get_activity':
            if (!id) return failure('Campaign ID is required')
            result = await api(`/campaigns/${id}/activity`, { params: { limit } })
            break
          case 'get_count':
            result = await api('/campaigns/count')
            break
          case 'add_account':
            if (!id) return failure('Campaign ID is required')
            if (!account_id) return failure('Account ID is required')
            result = await api('/campaigns/accounts', { method: 'POST', body: { campaign_id: id, account_id } })
            break
          case 'remove_account':
            if (!id) return failure('Campaign ID is required')
            if (!account_id) return failure('Account ID is required')
            result = await api('/campaigns/accounts', { method: 'DELETE', body: { campaign_id: id, account_id } })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
