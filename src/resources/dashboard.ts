import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { api } from '../client.js'

export function registerDashboardResource(server: McpServer) {
  server.resource(
    'dashboard',
    'messengerflow://dashboard',
    { description: 'Dashboard stats — messages sent, leads reached, active campaigns, response rate' },
    async () => {
      const data = await api('/dashboard/stats')
      return {
        contents: [{
          uri: 'messengerflow://dashboard',
          mimeType: 'application/json',
          text: JSON.stringify(data, null, 2),
        }],
      }
    },
  )
}
