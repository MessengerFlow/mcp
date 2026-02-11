import { config } from './config.js'

interface RequestOptions {
  method?: string
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
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
    'X-Api-Key': config.apiKey,
    'Accept': 'application/json',
  }
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    if (res.status === 401) throw new ApiError(401, 'API key is invalid or revoked')
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || '60'
      throw new ApiError(429, `Rate limited. Retry after ${retryAfter}s`)
    }

    let message = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data.error) message = data.error
      else if (data.message) message = data.message
    } catch {}

    if (res.status === 403) message = `Access denied: ${message}`
    throw new ApiError(res.status, message)
  }

  const text = await res.text()
  if (!text) return {} as T
  return JSON.parse(text) as T
}
