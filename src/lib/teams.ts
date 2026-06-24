/** Convert a team name to a URL-safe slug. e.g. "Atlanta Braves" → "atlanta-braves" */
export function teamNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Convert a slug back to a title-cased search string. e.g. "atlanta-braves" → "Atlanta Braves" */
export function slugToTeamSearch(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
