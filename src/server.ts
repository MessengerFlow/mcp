import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerCampaignTools } from './tools/campaigns.js'
import { registerAccountTools } from './tools/accounts.js'
import { registerLeadTools } from './tools/leads.js'
import { registerInboxTools } from './tools/inbox.js'
import { registerAnalyticsTools } from './tools/analytics.js'
import { registerDashboardResource } from './resources/dashboard.js'

export function createServer() {
  const server = new McpServer({
    name: 'MessengerFlow',
    version: '1.0.0',
  })

  registerCampaignTools(server)
  registerAccountTools(server)
  registerLeadTools(server)
  registerInboxTools(server)
  registerAnalyticsTools(server)

  registerDashboardResource(server)

  return server
}
