const HTML_DOCUMENT = /^\s*<(!doctype|html)/i

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function fieldErrors(data: any): string | undefined {
  const fields = data?.data?.fieldErrors
  if (!fields || typeof fields !== 'object') return undefined
  const parts = Object.entries(fields).flatMap(([field, messages]) =>
    Array.isArray(messages) ? messages.map(m => `${field}: ${m}`) : [],
  )
  return parts.length ? parts.join('; ') : undefined
}

export function errorFromBody(status: number, text: string): string {
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    return `Request failed (${status})`
  }
  const message = fieldErrors(data)
    ?? [data?.message, data?.error, data?.statusMessage].find(v => typeof v === 'string' && v)
  return message ?? `Request failed (${status})`
}

export function parseBody(contentType: string, text: string): unknown {
  if (!text) return {}
  if (HTML_DOCUMENT.test(text)) {
    throw new ApiError(502, 'The API returned a web page instead of data, so this route is not available')
  }
  if (contentType.includes('json')) return JSON.parse(text)
  return text
}
