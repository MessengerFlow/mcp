type TextPart = { type: 'text'; text: string }
type ImagePart = { type: 'image'; data: string; mimeType: string }

export function success(result: unknown) {
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return { content: [{ type: 'text' as const, text }] }
}

export function successWithImage(text: string, image?: string, mimeType = 'image/jpeg') {
  const content: Array<TextPart | ImagePart> = [{ type: 'text', text }]
  if (image) content.push({ type: 'image', data: image, mimeType })
  return { content }
}

export function failure(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true as const }
}
