import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { api } from '../client.js'

export function registerLeadTools(server: McpServer) {
  server.tool(
    'manage_leads',
    'Manage lead collections — import CSV, scrape groups/pages, merge, rename, delete, export. Browse individual leads within a collection.',
    {
      action: z.enum([
        'list_collections', 'get_collection', 'import', 'scrape_group', 'scrape_pages',
        'merge', 'rename', 'delete', 'get_leads', 'export', 'rescrape', 'retry',
      ]).describe('Action to perform'),
      id: z.string().optional().describe('Collection ID (required for get_collection/rename/delete/get_leads/export/rescrape/retry)'),
      data: z.record(z.unknown()).optional().describe('Request body for import/scrape/merge/rename actions'),
      limit: z.number().optional().describe('Pagination limit'),
      offset: z.number().optional().describe('Pagination offset'),
      search: z.string().optional().describe('Search query'),
    },
    async ({ action, id, data, limit, offset, search }) => {
      try {
        let result: unknown

        switch (action) {
          case 'list_collections':
            result = await api('/leads', { params: { limit, offset, search } })
            break
          case 'get_collection':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}`)
            break
          case 'import':
            result = await api('/leads/import', { method: 'POST', body: data })
            break
          case 'scrape_group':
            result = await api('/leads/groups', { method: 'POST', body: data })
            break
          case 'scrape_pages':
            result = await api('/leads/pages', { method: 'POST', body: data })
            break
          case 'merge':
            result = await api('/leads/merge', { method: 'POST', body: data })
            break
          case 'rename':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}`, { method: 'PATCH', body: data })
            break
          case 'delete':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}`, { method: 'DELETE' })
            break
          case 'get_leads':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}/leads`, { params: { limit, offset, search } })
            break
          case 'export':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}/export`)
            break
          case 'rescrape':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}/rescrape`, { method: 'POST' })
            break
          case 'retry':
            if (!id) return error('Collection ID is required')
            result = await api(`/leads/${id}/retry`, { method: 'POST' })
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
