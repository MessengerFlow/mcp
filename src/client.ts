import { config } from './config.js'
import { tokenStore } from './auth.js'
import { ApiError, errorFromBody, parseBody } from './errors.js'

export { ApiError }

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options

  let url = `${config.baseUrl}${path}`
  if (params) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) search.set(key, String(value))
    }
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  }
  const bearerToken = tokenStore.getStore()
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  } else {
    headers['X-Api-Key'] = config.apiKey
  }
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(401, bearerToken
        ? 'Your MessengerFlow session expired. Reconnect the MessengerFlow connector.'
        : 'API key is invalid or revoked')
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || '60'
      throw new ApiError(429, `Rate limited. Retry after ${retryAfter}s`)
    }

    const message = errorFromBody(res.status, text)
    throw new ApiError(res.status, res.status === 403 ? `Access denied: ${message}` : message)
  }

  return parseBody(res.headers.get('content-type') ?? '', text) as T
}
