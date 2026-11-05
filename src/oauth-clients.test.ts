import { test } from 'node:test'
import assert from 'node:assert/strict'
import { statelessClientsStore as store } from './oauth-clients.js'

const client = { client_id: 'ignored', redirect_uris: ['http://localhost:4000/callback'] } as any

test('a registered client resolves without any stored state', async () => {
  const registered = await store.registerClient!(client)
  const found = await store.getClient(registered.client_id)
  assert.deepEqual(found?.redirect_uris, client.redirect_uris)
})

test('registration never issues a secret that later requests would have to match', async () => {
  const registered = await store.registerClient!({ ...client, client_secret: 'abc' })
  assert.equal(registered.client_secret, undefined)
  assert.equal(registered.token_endpoint_auth_method, 'none')
})

test('ids issued before this scheme still resolve so they can refresh', async () => {
  const found = await store.getClient('0f961a9a-dc63-4275-8c50-cbf3346a4590')
  assert.ok(found)
  assert.equal(found?.client_secret, undefined)
})

test('a malformed encoded id is rejected', async () => {
  assert.equal(await store.getClient('mcp_not-json'), undefined)
})
