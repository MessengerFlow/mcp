const PROXY_FIELDS = ['id', 'managed', 'name', 'country', 'timezone', 'error', 'last_error', 'pool_status']

function pick(source: Record<string, unknown>, fields: string[]) {
  return Object.fromEntries(fields.filter(field => field in source).map(field => [field, source[field]]))
}

function redactAccount(account: any) {
  if (!account || typeof account !== 'object') return account
  const { chat_pin, owned_by, proxyData, ...rest } = account
  return {
    ...rest,
    has_chat_pin: !!chat_pin,
    ...(proxyData !== undefined && { proxyData: proxyData && pick(proxyData, PROXY_FIELDS) }),
  }
}

export function redactAccounts(response: any) {
  if (!response?.data) return response
  const data = Array.isArray(response.data) ? response.data.map(redactAccount) : redactAccount(response.data)
  return { ...response, data }
}
