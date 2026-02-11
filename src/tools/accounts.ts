import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'

export function registerAccountTools(server: McpServer) {
  server.tool(
    'manage_accounts',
    'Add, update, and delete Facebook accounts. View account stats and logs.',
    {
      action: z.enum(['list', 'add', 'update', 'delete', 'get_stats', 'get_logs']).describe('Action to perform'),
      id: z.string().optional().describe('Account ID (required for update/delete/get_stats/get_logs)'),
      data: z.record(z.unknown()).optional().describe('Request body for add/update actions'),
      limit: z.number().optional().describe('Pagination limit'),
      offset: z.number().optional().describe('Pagination offset'),
    },
    async ({ action, id, data, limit, offset }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = await api('/accounts', { params: { limit, offset } })
            break
          case 'add':
            result = await api('/accounts', { method: 'POST', body: data })
            break
          case 'update':
            if (!id) return error('Account ID is required')
            result = await api('/accounts', { method: 'PATCH', body: { id, ...data } })
            break
          case 'delete':
            if (!id) return error('Account ID is required')
            result = await api('/accounts', { method: 'DELETE', body: { id } })
            break
          case 'get_stats':
            if (!id) return error('Account ID is required')
            result = await api(`/accounts/${id}/stats`)
            break
          case 'get_logs':
            if (!id) return error('Account ID is required')
            result = await api(`/accounts/${id}/logs`, { params: { limit, offset } })
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
