import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'

const DESCRIPTION = `View conversations, search messages, send replies, update and delete conversations.

Actions and their fields:
- list: optional limit, offset, include_unavailable
- search: query, optional limit, offset, include_unavailable
- get_messages: id, optional limit (max 100), offset
- get_unread_count: optional include_unavailable
- send_message: id (conversation), data { body (max 2048 chars), image_urls, video_urls, voice_url, voice_duration }. Media links come from upload_media. This sends a real Facebook message to the lead.
- retry_message: data { message_id }. Retries a failed message.
- delete_message: data { message_id }. Removes a message that has not been sent.
- update: id, data { key, value } where key is 'read', 'pinned', 'tags', 'booked_at' or 'responded'
- delete: data { conversations: [conversation IDs] }

list, search and get_unread_count hide conversations on disabled or failing accounts unless include_unavailable is true.`

export function registerInboxTools(server: McpServer) {
  server.tool(
    'manage_inbox',
    DESCRIPTION,
    {
      action: z.enum([
        'list', 'search', 'get_messages', 'send_message', 'retry_message', 'delete_message',
        'update', 'delete', 'get_unread_count',
      ]).describe('Action to perform'),
      id: z.guid().optional().describe('Conversation ID'),
      data: z.record(z.string(), z.unknown()).optional().describe('Fields for send_message/update/delete, listed in the tool description'),
      query: z.string().optional().describe('Search query for search action'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Rows to skip'),
      include_unavailable: z.boolean().optional().describe('Include conversations on disabled or failing accounts'),
    },
    { title: 'Inbox', destructiveHint: true, openWorldHint: true },
    async ({ action, id, data, query, limit, offset, include_unavailable }) => {
      const available_only = include_unavailable ? false : undefined

      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = await api('/inbox/conversations', { params: { limit, from: offset, available_only } })
            break
          case 'search':
            if (!query) return failure('Search query is required')
            result = await api('/inbox/conversations/search', { params: { q: query, limit, from: offset, available_only } })
            break
          case 'get_messages':
            if (!id) return failure('Conversation ID is required')
            result = await api(`/inbox/conversations/${id}/messages`, { params: { limit, offset } })
            break
          case 'send_message':
            result = await api('/inbox/conversations/send', {
              method: 'POST',
              body: { ...(id && { conversation_id: id }), ...data },
            })
            break
          case 'retry_message':
            result = await api('/inbox/conversations/message-retry', { method: 'POST', body: data })
            break
          case 'delete_message':
            result = await api('/inbox/conversations/message', { method: 'DELETE', body: data })
            break
          case 'update':
            if (!id) return failure('Conversation ID is required')
            result = await api(`/inbox/conversations/${id}`, { method: 'PATCH', body: data })
            break
          case 'delete':
            result = await api('/inbox/conversations', { method: 'DELETE', body: data })
            break
          case 'get_unread_count':
            result = await api('/inbox/conversations/unread-count', { params: { available_only } })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
