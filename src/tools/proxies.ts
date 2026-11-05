import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Manage the user's own proxies and choose between managed and own proxies.

Actions and their fields:
- list: no fields. Passwords are never returned.
- add: data { ip, port, name (optional, max 32 chars), username (optional), password (optional), timezone (optional) }
- add_many: data { proxies: [{ ip, port, username, password, name, timezone }] }
- update: id, data { name, ip, port, username, password, enabled, timezone }
- delete: id
- verify: data { ip, port (as a string), username, password, proxyId (optional) }. Tests a proxy before saving it.
- set_mode: data { mode: 'managed' or 'self' }. managed uses MessengerFlow's IPs, self uses the user's own proxies.

Managed proxies are assigned automatically and cannot be attached or edited here. Proxy passwords passed here appear in this conversation.`

export function registerProxyTools(server: McpServer) {
  server.tool(
    'manage_proxies',
    DESCRIPTION,
    {
      action: z.enum(['list', 'add', 'add_many', 'update', 'delete', 'verify', 'set_mode']).describe('Action to perform'),
      id: z.guid().optional().describe('Proxy ID'),
      data: z.record(z.string(), z.unknown()).optional().describe('Fields for the action, listed in the tool description'),
    },
    { title: 'Proxies', destructiveHint: true, openWorldHint: true },
    async ({ action, id, data }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list':
            result = await api('/proxies')
            break
          case 'add':
            result = await api('/proxies', { method: 'POST', body: data })
            break
          case 'add_many':
            result = await api('/proxies/bulk', { method: 'POST', body: data })
            break
          case 'update':
            if (!id) return failure('Proxy ID is required')
            result = await api(`/proxies/${id}`, { method: 'PATCH', body: data })
            break
          case 'delete':
            if (!id) return failure('Proxy ID is required')
            result = await api(`/proxies/${id}`, { method: 'DELETE' })
            break
          case 'verify':
            result = await api('/proxies/verify', { method: 'POST', body: data })
            break
          case 'set_mode':
            result = await api('/proxies/mode', { method: 'POST', body: data })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
