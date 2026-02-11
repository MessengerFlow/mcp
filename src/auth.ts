import { AsyncLocalStorage } from 'node:async_hooks'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

export const tokenStore = new AsyncLocalStorage<string>()

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM_URL || 'https://auth.messengerflow.com/realms/messengerflow'

let jwks: ReturnType<typeof createRemoteJWKSet>
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${KEYCLOAK_REALM}/protocol/openid-connect/certs`))
  return jwks
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  const { payload } = await jwtVerify(token, getJwks(), { issuer: KEYCLOAK_REALM })
  return {
    token,
    clientId: (payload.azp as string) || '',
    scopes: ((payload.scope as string) || '').split(' ').filter(Boolean),
    expiresAt: payload.exp,
  }
}
