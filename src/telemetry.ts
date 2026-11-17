import { AsyncLocalStorage } from 'node:async_hooks'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

export const MCP_VERSION = '1.4.0'

export interface ToolCall {
  tool: string
  action?: string
}

export const toolStore = new AsyncLocalStorage<ToolCall>()

export function toolHeader(call: ToolCall | undefined): string | undefined {
  if (!call) return undefined
  return call.action ? `${call.tool}:${call.action}` : call.tool
}

export function instrumentTools(server: McpServer): McpServer {
  const register = server.tool.bind(server) as (...args: any[]) => any
  ;(server as any).tool = (...args: any[]) => {
    const name = String(args[0])
    const handler = args[args.length - 1]
    if (typeof handler === 'function') {
      args[args.length - 1] = (input: any, extra: any) => {
        const action = input && typeof input.action === 'string' ? input.action : undefined
        return toolStore.run({ tool: name, action }, () => handler(input, extra))
      }
    }
    return register(...args)
  }
  return server
}
