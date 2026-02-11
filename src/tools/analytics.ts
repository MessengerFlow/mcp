import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    'get_analytics',
    'Get dashboard stats, activity charts, performance metrics, and message/booking charts.',
    {
      action: z.enum([
        'dashboard_stats', 'activity_chart', 'performance', 'messages_chart', 'bookings_chart',
      ]).describe('Action to perform'),
      period: z.string().optional().describe('Time period filter (e.g. "7d", "30d")'),
    },
    async ({ action, period }) => {
      try {
        let result: unknown

        switch (action) {
          case 'dashboard_stats':
            result = await api('/dashboard/stats', { params: { period } })
            break
          case 'activity_chart':
            result = await api('/dashboard/activity', { params: { period } })
            break
          case 'performance':
            result = await api('/dashboard/performance', { params: { period } })
            break
          case 'messages_chart':
            result = await api('/charts/messages', { params: { period } })
            break
          case 'bookings_chart':
            result = await api('/charts/bookings', { params: { period } })
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
