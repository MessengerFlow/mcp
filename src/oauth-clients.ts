import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js'
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js'

const ENCODED_PREFIX = 'mcp_'
const KNOWN_CALLBACKS = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
]

function publicClient(clientId: string, redirectUris: string[]): OAuthClientInformationFull {
  return {
    client_id: clientId,
    redirect_uris: redirectUris,
    token_endpoint_auth_method: 'none',
  } as OAuthClientInformationFull
}

function decodeRedirectUris(clientId: string): string[] | undefined {
  try {
    const decoded = JSON.parse(Buffer.from(clientId.slice(ENCODED_PREFIX.length), 'base64url').toString('utf8'))
    return Array.isArray(decoded) && decoded.every(uri => typeof uri === 'string') ? decoded : undefined
  } catch {
    return undefined
  }
}

// Every client shares one public Keycloak client, which enforces the redirect
// allowlist. Keeping the URIs inside client_id means a registration survives a
// restart, and ids issued before this scheme can still refresh their tokens.
export const statelessClientsStore: OAuthRegisteredClientsStore = {
  getClient: async (clientId) => {
    if (!clientId.startsWith(ENCODED_PREFIX)) return publicClient(clientId, KNOWN_CALLBACKS)
    const redirectUris = decodeRedirectUris(clientId)
    return redirectUris ? publicClient(clientId, redirectUris) : undefined
  },
  registerClient: async (client) => ({
    ...client,
    client_id: ENCODED_PREFIX + Buffer.from(JSON.stringify(client.redirect_uris)).toString('base64url'),
    token_endpoint_auth_method: 'none',
    client_secret: undefined,
    client_secret_expires_at: undefined,
  }),
}
