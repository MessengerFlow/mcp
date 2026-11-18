import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'

const DESCRIPTION = `Get dashboard stats, activity charts, performance metrics, and message and booking charts.

dashboard_stats and performance always cover fixed windows. period applies to activity_chart, messages_chart and bookings_chart.

account_report: optional days (1-90, default 7). Per account: friend requests sent, accepted, messages sent (incl. follow-ups) and replies from people the campaigns contacted, plus any problem stopping the account with its fix, and when warming accounts start sending. These are the same numbers as the report emails. Accepted requests are picked up during inbox syncs, so the newest can lag a few hours.`

export function registerAnalyticsTools(server: McpServer) {
  server.tool(
    'get_analytics',
    DESCRIPTION,
    {
      action: z.enum([
        'dashboard_stats', 'activity_chart', 'performance', 'messages_chart', 'bookings_chart', 'account_report',
      ]).describe('Action to perform'),
      period: z.enum(['day', 'week', 'month']).optional().describe('Chart window'),
      days: z.number().int().min(1).max(90).optional().describe('account_report window in days'),
    },
    { title: 'Analytics', readOnlyHint: true, openWorldHint: true },
    async ({ action, period, days }) => {
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
          case 'account_report':
            result = await api('/reports/summary', { params: { days } })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
