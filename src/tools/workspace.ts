import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Account-level items: plan and limits, billing, notifications, saved replies, campaign drafts, webhooks, and AI message rewriting.

Actions and their fields:
- get_plan: no fields. Returns the plan, status, limits and enabled features.
- list_invoices: optional limit
- billing_portal_link: no fields. Returns a link where the user manages payment details themselves.
- preview_plan_change: data { plan: 'ignition', 'momentum' or 'apex', interval: 'monthly' or 'yearly' }. Shows the cost of a change without making it. Plan changes are made by the user.
- list_notifications: no fields
- mark_notifications_read: data { ids: [numbers] } or data { all: true }
- list_saved_replies: no fields
- add_saved_reply: data { body }
- delete_saved_reply: id
- list_drafts: no fields
- save_draft: data { name, data } saves a new campaign draft. With id, updates that draft.
- delete_draft: id
- list_webhooks: no fields
- create_webhook: data { url (https), events }
- update_webhook: id, data { url, events, enabled }
- delete_webhook, test_webhook: id
- rewrite_message: data { text }. Returns an improved version of a message. Needs AI features on the plan.

Webhook events: message.sent, message.failed, conversation.created, conversation.reply, conversation.booked, campaign.completed, account.status_changed.`

const ACTIONS = [
  'get_plan', 'list_invoices', 'billing_portal_link', 'preview_plan_change',
  'list_notifications', 'mark_notifications_read',
  'list_saved_replies', 'add_saved_reply', 'delete_saved_reply',
  'list_drafts', 'save_draft', 'delete_draft',
  'list_webhooks', 'create_webhook', 'update_webhook', 'delete_webhook', 'test_webhook',
  'rewrite_message',
] as const

export function registerWorkspaceTools(server: McpServer) {
  server.tool(
    'manage_workspace',
    DESCRIPTION,
    {
      action: z.enum(ACTIONS).describe('Action to perform'),
      id: z.guid().optional().describe('ID of the saved reply, draft or webhook'),
      data: z.record(z.string(), z.unknown()).optional().describe('Fields for the action, listed in the tool description'),
      limit: z.number().optional().describe('Page size'),
    },
    { title: 'Workspace', destructiveHint: true, openWorldHint: true },
    async ({ action, id, data, limit }) => {
      try {
        let result: unknown

        switch (action) {
          case 'get_plan':
            result = await api('/billing/status')
            break
          case 'list_invoices':
            result = await api('/billing/invoices', { params: { limit } })
            break
          case 'billing_portal_link':
            result = await api('/billing/portal', { method: 'POST' })
            break
          case 'preview_plan_change':
            result = await api('/billing/change-plan-preview', { method: 'POST', body: data })
            break
          case 'list_notifications':
            result = await api('/notifications')
            break
          case 'mark_notifications_read':
            result = await api('/notifications/read', { method: 'PATCH', body: data })
            break
          case 'list_saved_replies':
            result = await api('/presets')
            break
          case 'add_saved_reply':
            result = await api('/presets', { method: 'POST', body: data })
            break
          case 'delete_saved_reply':
            if (!id) return failure('Saved reply ID is required')
            result = await api(`/presets/${id}`, { method: 'DELETE' })
            break
          case 'list_drafts':
            result = await api('/drafts')
            break
          case 'save_draft':
            result = id
              ? await api(`/drafts/${id}`, { method: 'PUT', body: data })
              : await api('/drafts', { method: 'POST', body: data })
            break
          case 'delete_draft':
            if (!id) return failure('Draft ID is required')
            result = await api(`/drafts/${id}`, { method: 'DELETE' })
            break
          case 'list_webhooks':
            result = await api('/webhooks/endpoints')
            break
          case 'create_webhook':
            result = await api('/webhooks/endpoints', { method: 'POST', body: data })
            break
          case 'update_webhook':
            if (!id) return failure('Webhook ID is required')
            result = await api(`/webhooks/endpoints/${id}`, { method: 'PATCH', body: data })
            break
          case 'delete_webhook':
            if (!id) return failure('Webhook ID is required')
            result = await api(`/webhooks/endpoints/${id}`, { method: 'DELETE' })
            break
          case 'test_webhook':
            if (!id) return failure('Webhook ID is required')
            result = await api(`/webhooks/endpoints/${id}/test`, { method: 'POST' })
            break
          case 'rewrite_message':
            result = await api('/ai/enhance', { method: 'POST', body: data })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
