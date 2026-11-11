export function groupScrapeBody(data: Record<string, unknown> = {}): Record<string, unknown> {
  const { things_in_common, ...rest } = data
  return {
    group_target_countries: [],
    ...rest,
    ...(things_in_common === true ? { members_source: 'things_in_common' } : {}),
  }
}
