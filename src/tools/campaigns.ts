import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'

export function registerCampaignTools(server: McpServer) {
  server.tool(
    'manage_campaigns',
    'Create, update, start, stop, and delete campaigns. View campaign leads and activity. Manage campaign account assignments.',
    {
      action: z.enum([
        'list', 'get', 'create', 'update', 'start', 'stop', 'delete',
        'get_leads', 'get_activity', 'get_count', 'add_account', 'remove_account',
      ]).describe('Action to perform'),
      id: z.string().optional().describe('Campaign ID (required for get/update/start/stop/delete/get_leads/get_activity)'),
      data: z.record(z.unknown()).optional().describe('Request body for create/update actions'),
      account_id: z.string().optional().describe('Account ID for add_account/remove_account'),
      limit: z.number().optional().describe('Pagination limit'),
      offset: z.number().optional().describe('Pagination offset'),
      search: z.string().optional().describe('Search query'),
    },
    async ({ action, id, data, account_id, limit, offset, search }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = await api('/campaigns', { params: { limit, offset, search } })
            break
          case 'get':
            if (!id) return error('Campaign ID is required')
            result = await api(`/campaigns/${id}`)
            break
          case 'create':
            result = await api('/campaigns', { method: 'POST', body: data })
            break
          case 'update':
            if (!id) return error('Campaign ID is required')
            result = await api('/campaigns', { method: 'PATCH', body: { id, ...data } })
            break
          case 'start':
            if (!id) return error('Campaign ID is required')
            result = await api('/campaigns', { method: 'PATCH', body: { id, paused: false } })
            break
          case 'stop':
            if (!id) return error('Campaign ID is required')
            result = await api('/campaigns', { method: 'PATCH', body: { id, paused: true } })
            break
          case 'delete':
            if (!id) return error('Campaign ID is required')
            result = await api('/campaigns/destroy', { method: 'POST', body: { id } })
            break
          case 'get_leads':
            if (!id) return error('Campaign ID is required')
            result = await api(`/campaigns/${id}/leads`, { params: { limit, offset, search } })
            break
          case 'get_activity':
            if (!id) return error('Campaign ID is required')
            result = await api(`/campaigns/${id}/activity`, { params: { limit, offset } })
            break
          case 'get_count':
            result = await api('/campaigns/count')
            break
          case 'add_account':
            if (!id) return error('Campaign ID is required')
            if (!account_id) return error('Account ID is required')
            result = await api('/campaigns/accounts', { method: 'POST', body: { campaign_id: id, account_id } })
            break
          case 'remove_account':
            if (!id) return error('Campaign ID is required')
            if (!account_id) return error('Account ID is required')
            result = await api('/campaigns/accounts', { method: 'DELETE', body: { campaign_id: id, account_id } })
            break
        }

        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
      } catch (e: any) {
        return error(e.message)
      }
    },
  )
}

function error(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true as const }
}
