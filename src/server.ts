import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerCampaignTools } from './tools/campaigns.js'
import { registerAccountTools } from './tools/accounts.js'
import { registerLeadTools } from './tools/leads.js'
import { registerInboxTools } from './tools/inbox.js'
import { registerAnalyticsTools } from './tools/analytics.js'
import { registerMediaTools } from './tools/media.js'
import { registerProxyTools } from './tools/proxies.js'
import { registerSettingsTools } from './tools/settings.js'
import { registerDashboardResource } from './resources/dashboard.js'

const INSTRUCTIONS = `MessengerFlow sends Facebook outreach from the user's accounts.

At the start of a session, call manage_settings get_plan so you know the user's plan, limits, enabled features and current usage. Work within them. If something needs a higher plan, say which plan includes it instead of attempting it, and offer what the current plan can do. Never change a plan yourself.

Typical flow: check manage_accounts for healthy accounts, find and join groups or use friend suggestions, build a lead collection with manage_leads, create a campaign with manage_campaigns, review it with the user, then start it. Follow results with get_analytics and reply through manage_inbox.

Confirm with the user before anything that reaches real people or cannot be undone: starting a campaign, sending a message, joining a group, publishing a post, deleting anything.

Accounts in warmup are held back or send at reduced volume until warmup_unlocks_at. Do not suggest raising limits to get around this.

If an account hits a captcha or login check, stop what you are doing and tell the user what happened and how to move forward: they sign in themselves through the manage_accounts live_session_link and handle it there. Do not try to get past it. Passwords and 2FA keys passed to manage_accounts add appear in this conversation, so suggest the account form in the app for those.`

export function createServer() {
  const server = new McpServer(
    { name: 'MessengerFlow', version: '1.4.0' },
    { instructions: INSTRUCTIONS },
  )

  registerCampaignTools(server)
  registerAccountTools(server)
  registerLeadTools(server)
  registerInboxTools(server)
  registerAnalyticsTools(server)
  registerProxyTools(server)
  registerMediaTools(server)
  registerSettingsTools(server)

  registerDashboardResource(server)

  return server
}
