import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'

export function registerInboxTools(server: McpServer) {
  server.tool(
    'manage_inbox',
    'View conversations, search messages, send replies, mark read/unread, and delete conversations.',
    {
      action: z.enum([
        'list', 'search', 'get_messages', 'send_message', 'update', 'delete', 'get_unread_count',
      ]).describe('Action to perform'),
      id: z.string().optional().describe('Conversation ID (required for get_messages/update)'),
      data: z.record(z.unknown()).optional().describe('Request body for send_message/update/delete actions'),
      query: z.string().optional().describe('Search query for search action'),
      limit: z.number().optional().describe('Pagination limit'),
      offset: z.number().optional().describe('Pagination offset'),
    },
    async ({ action, id, data, query, limit, offset }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = await api('/inbox/conversations', { params: { limit, offset } })
            break
          case 'search':
            if (!query) return error('Search query is required')
            result = await api('/inbox/conversations/search', { params: { q: query, limit, offset } })
            break
          case 'get_messages':
            if (!id) return error('Conversation ID is required')
            result = await api(`/inbox/conversations/${id}/messages`, { params: { limit, offset } })
            break
          case 'send_message':
            result = await api('/inbox/conversations/send', { method: 'POST', body: data })
            break
          case 'update':
            if (!id) return error('Conversation ID is required')
            result = await api(`/inbox/conversations/${id}`, { method: 'PATCH', body: data })
            break
          case 'delete':
            result = await api('/inbox/conversations', { method: 'DELETE', body: data })
            break
          case 'get_unread_count':
            result = await api('/inbox/conversations/unread-count')
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
