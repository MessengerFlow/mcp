import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { validateConfig } from './config.js'
import { createServer } from './server.js'

validateConfig()

const server = createServer()
const transport = new StdioServerTransport()
await server.connect(transport)
