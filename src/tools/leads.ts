import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'
import { failure, success } from './result.js'
import { truncateCsv } from './truncate.js'

const DESCRIPTION = `Manage lead collections: import, scrape groups or pages, merge, rename, delete, export. Browse leads inside a collection.

Actions and their fields:
- list_collections: optional limit, offset, search (collection name)
- get_collection, delete, export, rescrape, retry: id
- get_leads: id, optional limit (max 100), offset, search
- rename: id, data { name }
- import: data { name, data: [{ id (Facebook ID, letters and digits), name (optional) }] }. Parse a CSV into this array first.
- scrape_group: data { name, group_id (from the group URL), account_id (a healthy account that has joined the group), group_target_countries (optional array of country names, keeps members whose name looks like it comes from those countries; it is estimated from names, not location, so treat it as a rough filter, and it needs AI features on the plan), max (optional), filter_keywords (optional array) }
- scrape_suggestions: data { name, account_id, max (optional, up to 500, default 200), min_mutual_friends (optional) }. Builds a collection from the people Facebook suggests to that account, keeping how many mutual friends each has. Campaigns reach people with the most mutual friends first.
- scrape_pages: data { name, query, locations (1-200 strings), keywords (array, max 10), excludedKeywords (array, max 10) }
- merge: data { name, collection_ids }
- get_limit: no fields. Returns how many imported leads the plan still allows.
- recontact_audience: data { name, inactive_days (1-3650), include_replied (optional, default false) }. Builds a collection of people whose last message from this user is older than inactive_days. People who replied or booked are left out by default.

Scrapes run in the background and can take hours, so check progress with get_collection. export returns CSV text and shortens very large collections.`

export function registerLeadTools(server: McpServer) {
  server.tool(
    'manage_leads',
    DESCRIPTION,
    {
      action: z.enum([
        'list_collections', 'get_collection', 'import', 'scrape_group', 'scrape_suggestions', 'scrape_pages',
        'merge', 'rename', 'delete', 'get_leads', 'export', 'rescrape', 'retry', 'get_limit', 'recontact_audience',
      ]).describe('Action to perform'),
      id: z.guid().optional().describe('Collection ID'),
      data: z.record(z.string(), z.unknown()).optional().describe('Fields for import/scrape/merge/rename, listed in the tool description'),
      limit: z.number().optional().describe('Page size'),
      offset: z.number().optional().describe('Rows to skip'),
      search: z.string().optional().describe('Search query'),
    },
    { title: 'Lead collections', destructiveHint: true, openWorldHint: true },
    async ({ action, id, data, limit, offset, search }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list_collections':
            result = await api('/leads', { params: { limit, offset, search } })
            break
          case 'get_collection':
            if (!id) return failure('Collection ID is required')
            result = await api(`/leads/${id}`)
            break
          case 'import':
            result = await api('/leads/import', { method: 'POST', body: data })
            break
          case 'scrape_group':
            result = await api('/leads/groups', { method: 'POST', body: { group_target_countries: [], ...data } })
            break
          case 'scrape_suggestions':
            result = await api('/leads/suggestions', { method: 'POST', body: data })
            break
          case 'scrape_pages':
            result = await api('/leads/pages', { method: 'POST', body: data })
            break
          case 'merge':
            result = await api('/leads/merge', { method: 'POST', body: data })
            break
          case 'rename':
            if (!id) return failure('Collection ID is required')
            result = await api(`/leads/${id}`, { method: 'PATCH', body: data })
            break
          case 'delete':
            if (!id) return failure('Collection ID is required')
            result = await api(`/leads/${id}`, { method: 'DELETE' })
            break
          case 'get_leads':
            if (!id) return failure('Collection ID is required')
            result = await api(`/leads/${id}/leads`, { params: { limit, offset, search } })
            break
          case 'export':
            if (!id) return failure('Collection ID is required')
            result = truncateCsv(await api<string>(`/leads/${id}/export`))
            break
          case 'recontact_audience':
            result = await api('/leads/recontact', { method: 'POST', body: data })
            break
          case 'get_limit':
            result = await api('/leads/limit')
            break
          case 'rescrape':
            if (!id) return failure('Collection ID is required')
            result = await api(`/leads/${id}/rescrape`, { method: 'POST' })
            break
          case 'retry':
            if (!id) return failure('Collection ID is required')
            result = await api(`/leads/${id}/retry`, { method: 'POST' })
            break
        }

        return success(result)
      } catch (e: any) {
        return failure(e.message)
      }
    },
  )
}
