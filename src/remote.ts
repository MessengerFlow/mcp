import { randomUUID } from 'node:crypto'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js'
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js'
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js'
import { OAuthTokensSchema } from '@modelcontextprotocol/sdk/shared/auth.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js'
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js'
import type { OAuthClientInformationFull, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js'
import type { Response } from 'express'
import { tokenStore, verifyAccessToken } from './auth.js'
import { createServer } from './server.js'

const PORT = parseInt(process.env.PORT || '3003')
const ISSUER_URL = process.env.MCP_ISSUER_URL || `http://localhost:${PORT}`
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM_URL || 'https://auth.messengerflow.com/realms/messengerflow'
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'messengerflow-mcp'

class KeycloakOAuthProvider implements OAuthServerProvider {
  skipLocalPkceValidation = true
  private clients = new Map<string, OAuthClientInformationFull>()

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: async (clientId: string) => this.clients.get(clientId),
      registerClient: async (clientInfo: OAuthClientInformationFull) => {
        this.clients.set(clientInfo.client_id, clientInfo)
        return clientInfo
      },
    }
  }

  async authorize(_client: OAuthClientInformationFull, params: AuthorizationParams, res: Response) {
    const url = new URL(`${KEYCLOAK_REALM}/protocol/openid-connect/auth`)
    const searchParams = new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      response_type: 'code',
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    })
    if (params.state) searchParams.set('state', params.state)
    const ALLOWED_SCOPES = ['openid', 'profile', 'email', 'offline_access']
    const scopes = params.scopes?.filter(s => ALLOWED_SCOPES.includes(s))
    if (scopes?.length) searchParams.set('scope', scopes.join(' '))
    url.search = searchParams.toString()
    res.redirect(url.toString())
  }

  async challengeForAuthorizationCode() {
    return ''
  }

  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
    codeVerifier?: string,
    redirectUri?: string,
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CLIENT_ID,
      code: authorizationCode,
    })
    if (codeVerifier) params.set('code_verifier', codeVerifier)
    if (redirectUri) params.set('redirect_uri', redirectUri)

    const response = await fetch(`${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Token exchange failed (${response.status}): ${text}`)
    }
    return OAuthTokensSchema.parse(await response.json())
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
  ): Promise<OAuthTokens> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID,
      refresh_token: refreshToken,
    })
    if (scopes?.length) params.set('scope', scopes.join(' '))

    const response = await fetch(`${KEYCLOAK_REALM}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Token refresh failed (${response.status}): ${text}`)
    }
    return OAuthTokensSchema.parse(await response.json())
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    return verifyAccessToken(token)
  }
}

const app = createMcpExpressApp({
  allowedHosts: ['mcp.messengerflow.com', 'localhost', '127.0.0.1'],
})
app.set('trust proxy', 1)

const provider = new KeycloakOAuthProvider()
const issuerUrl = new URL(ISSUER_URL)
const mcpServerUrl = new URL('/mcp', ISSUER_URL)

app.use(mcpAuthRouter({
  provider,
  issuerUrl,
  resourceServerUrl: mcpServerUrl,
}))

const authMiddleware = requireBearerAuth({
  verifier: { verifyAccessToken },
  requiredScopes: [],
  resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpServerUrl),
})

const transports = new Map<string, StreamableHTTPServerTransport>()

app.post('/mcp', authMiddleware, async (req: any, res: any) => {
  const token = req.auth?.token as string | undefined
  const sessionId = req.headers['mcp-session-id'] as string | undefined

  try {
    let transport: StreamableHTTPServerTransport

    if (sessionId && transports.has(sessionId)) {
      transport = transports.get(sessionId)!
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          transports.set(sid, transport)
        },
      })
      transport.onclose = () => {
        const sid = transport.sessionId
        if (sid) transports.delete(sid)
      }
      const server = createServer()
      await server.connect(transport)
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID' },
        id: null,
      })
      return
    }

    await tokenStore.run(token!, () => transport.handleRequest(req, res, req.body))
  } catch (error) {
    console.error('MCP request error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      })
    }
  }
})

app.get('/mcp', authMiddleware, async (req: any, res: any) => {
  const token = req.auth?.token as string | undefined
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  const transport = sessionId ? transports.get(sessionId) : undefined
  if (!transport) {
    res.status(400).send('Invalid or missing session ID')
    return
  }
  await tokenStore.run(token!, () => transport.handleRequest(req, res))
})

app.delete('/mcp', authMiddleware, async (req: any, res: any) => {
  const token = req.auth?.token as string | undefined
  const sessionId = req.headers['mcp-session-id'] as string | undefined
  const transport = sessionId ? transports.get(sessionId) : undefined
  if (!transport) {
    res.status(400).send('Invalid or missing session ID')
    return
  }
  await tokenStore.run(token!, () => transport.handleRequest(req, res))
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MCP remote server listening on port ${PORT}`)
  console.log(`Issuer: ${ISSUER_URL}`)
})

process.on('SIGINT', async () => {
  for (const [, transport] of transports) {
    await transport.close().catch(() => {})
  }
  process.exit(0)
})
