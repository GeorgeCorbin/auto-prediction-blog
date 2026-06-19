export interface SportConfig {
  key: string;
  label: string;
  espnSport: string;
  espnLeague: string;
  oddsApiKey: string;
  articleSlugPrefix: string;
  promptTemplate: string;
  enabled: boolean;
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
  // Future sports — set enabled: true when ready
  // { key: 'nfl', label: 'NFL', espnSport: 'football', espnLeague: 'nfl', oddsApiKey: 'americanfootball_nfl', articleSlugPrefix: '/nfl', promptTemplate: 'nfl', enabled: false },
  // { key: 'nba', label: 'NBA', espnSport: 'basketball', espnLeague: 'nba', oddsApiKey: 'basketball_nba', articleSlugPrefix: '/nba', promptTemplate: 'nba', enabled: false },
];

export const ENABLED_SPORTS = SPORTS.filter((s) => s.enabled);

export function getSportConfig(key: string): SportConfig | undefined {
  return SPORTS.find((s) => s.key === key);
}
