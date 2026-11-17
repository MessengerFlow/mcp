import { test } from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { instrumentTools, toolHeader, toolStore } from './telemetry.js'
import { authHeaders } from './client.js'

test('tool calls run with the tool and action in context, and API requests carry them', async () => {
  const registered: Record<string, (input: any, extra: any) => unknown> = {}
  const fake = { tool: (...args: any[]) => { registered[args[0]] = args[args.length - 1] } }
  const server = instrumentTools(fake as any)
  let seen: Record<string, string> | undefined
  server.tool('manage_campaigns', 'test tool', { action: z.string() }, async () => {
    seen = authHeaders()
    return { content: [{ type: 'text' as const, text: 'ok' }] }
  })

  await registered.manage_campaigns({ action: 'create' }, {})

  assert.equal(seen?.['X-MF-Tool'], 'manage_campaigns:create')
  assert.match(seen?.['X-MF-Client'] ?? '', /^mcp\/\S+ local$/)
})

test('requests outside a tool call carry no tool header', () => {
  assert.equal(toolStore.getStore(), undefined)
  assert.equal(authHeaders()['X-MF-Tool'], undefined)
  assert.equal(toolHeader({ tool: 'get_analytics' }), 'get_analytics')
})
