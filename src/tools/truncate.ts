export const MAX_EXPORT_CHARS = 100_000

export function truncateCsv(csv: string, max = MAX_EXPORT_CHARS): string {
  if (csv.length <= max) return csv
  const cut = csv.lastIndexOf('\n', max)
  const kept = csv.slice(0, cut > 0 ? cut : max)
  const shown = kept.split('\n').length - 1
  const total = csv.trimEnd().split('\n').length - 1
  return `${kept}\n\n[Showing ${shown} of ${total} leads. Use get_leads with limit and offset for the rest.]`
}
