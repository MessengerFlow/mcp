import { AsyncLocalStorage } from 'node:async_hooks'
import { createRemoteJWKSet, errors, jwtVerify } from 'jose'
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'

export const tokenStore = new AsyncLocalStorage<string>()

const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM_URL || 'https://auth.messengerflow.com/realms/messengerflow'
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'messengerflow-mcp'

let jwks: ReturnType<typeof createRemoteJWKSet>
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${KEYCLOAK_REALM}/protocol/openid-connect/certs`))
  return jwks
}

export async function verifyAccessToken(token: string): Promise<AuthInfo> {
  let payload
  try {
    ({ payload } = await jwtVerify(token, getJwks(), { issuer: KEYCLOAK_REALM }))
  } catch (error) {
    if (error instanceof errors.JOSEError && !(error instanceof errors.JWKSTimeout)) {
      throw new InvalidTokenError('Token is invalid or expired')
    }
    throw error
  }

  if (payload.azp !== KEYCLOAK_CLIENT_ID) {
    throw new InvalidTokenError('Token was not issued for this server')
  }

  return {
    token,
    clientId: (payload.azp as string) || '',
    scopes: ((payload.scope as string) || '').split(' ').filter(Boolean),
    expiresAt: payload.exp,
  }
}
