import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Get dashboard stats, activity charts, performance metrics, and message and booking charts.

dashboard_stats and performance always cover fixed windows. period applies to activity_chart, messages_chart and bookings_chart.`

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    'get_analytics',
    DESCRIPTION,
    {
      action: z.enum([
        'dashboard_stats', 'activity_chart', 'performance', 'messages_chart', 'bookings_chart',
      ]).describe('Action to perform'),
      period: z.enum(['day', 'week', 'month']).optional().describe('Chart window'),
    },
    { title: 'Analytics', readOnlyHint: true, openWorldHint: true },
    async ({ action, period }) => {
      try {
        let result: unknown

        switch (action) {
          case 'dashboard_stats':
            result = await api('/dashboard/stats')
            break
          case 'activity_chart':
            result = await api('/dashboard/activity', { params: { period } })
            break
          case 'performance':
            result = await api('/dashboard/performance')
            break
          case 'messages_chart':
            result = await api('/charts/messages', { params: { period } })
            break
          case 'bookings_chart':
            result = await api('/charts/bookings', { params: { period } })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
