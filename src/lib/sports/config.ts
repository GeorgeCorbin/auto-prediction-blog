export interface SportConfig {
  key: string;
  label: string;
  espnSport: string;
  espnLeague: string;
  oddsApiKey: string;
  articleSlugPrefix: string;
  promptTemplate: string;
  enabled: boolean;
  /** Inclusive ISO date window (YYYY-MM-DD) when the sport is active */
  enabledDuring?: { start: string; end: string };
  /** Days before kickoff to start generating articles (0 = game day only). */
  articleLeadDays?: number;
  /** Days ahead of today to fetch from ESPN scoreboard (0 = today only). */
  scanLookaheadDays?: number;
}

export const SPORTS: SportConfig[] = [
  {
    key: 'mlb',
    label: 'MLB',
    espnSport: 'baseball',
    espnLeague: 'mlb',
    oddsApiKey: 'baseball_mlb',
    articleSlugPrefix: '/mlb',
    promptTemplate: 'mlb',
    enabled: true,
  },
  {
    key: 'world-cup',
    label: 'World Cup',
    espnSport: 'soccer',
    espnLeague: 'fifa.world',
    oddsApiKey: 'soccer_fifa_world_cup',
    articleSlugPrefix: '/world-cup',
    promptTemplate: 'world-cup',
    enabled: true,
    enabledDuring: { start: '2026-06-11', end: '2026-07-19' },
    articleLeadDays: 3,
    scanLookaheadDays: 3,
  },
  // Future sports — set enabled: true when ready
  // { key: 'nfl', label: 'NFL', espnSport: 'football', espnLeague: 'nfl', oddsApiKey: 'americanfootball_nfl', articleSlugPrefix: '/nfl', promptTemplate: 'nfl', enabled: false },
  // { key: 'nba', label: 'NBA', espnSport: 'basketball', espnLeague: 'nba', oddsApiKey: 'basketball_nba', articleSlugPrefix: '/nba', promptTemplate: 'nba', enabled: false },
];

export const ENABLED_SPORTS = SPORTS.filter((s) => s.enabled);

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isSportInSeason(sport: SportConfig, date: Date = new Date()): boolean {
  if (!sport.enabledDuring) return true;
  const day = toIsoDate(date);
  return day >= sport.enabledDuring.start && day <= sport.enabledDuring.end;
}

/** Sports that are enabled and within their active date window (if any). */
export function getActiveSports(date: Date = new Date()): SportConfig[] {
  return SPORTS.filter((s) => s.enabled && isSportInSeason(s, date));
}

export function getSportConfig(key: string): SportConfig | undefined {
  return SPORTS.find((s) => s.key === key);
}
