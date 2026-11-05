export function success(result: unknown) {
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return { content: [{ type: 'text' as const, text }] }
}

export function failure(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true as const }
}
