export function buildArticleSlug(
  awayTeamAbbr: string,
  homeTeamAbbr: string,
  scheduledAt: Date,
): string {
  const month = scheduledAt.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const day = scheduledAt.getDate();
  const year = scheduledAt.getFullYear();
  return `${awayTeamAbbr.toLowerCase()}-vs-${homeTeamAbbr.toLowerCase()}-prediction-${month}-${day}-${year}`;
}
