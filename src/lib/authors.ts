export const AUTHORS = [
  'Jake Reynolds',
  'Ryan Carter',
  'Tyler Brooks',
  'Ethan Walker',
  'Mason Cooper',
  'Logan Mitchell',
  'Caleb Foster',
  'Owen Bennett',
  'Dylan Parker',
  'Nathan Hayes',
  'Connor Sullivan',
  'Zachary Price',
  'Hunter Collins',
  'Austin Grant',
  'Trevor Morgan',
  'Luke Harrison',
  'Brandon Pierce',
  'Cameron Scott',
  'Cole Richardson',
  'Garrett Thompson',
  'Noah Daniels',
  'Blake Peterson',
  'Jordan Miller',
  'Wyatt Anderson',
  'Evan Roberts',
] as const;

export const WORLD_CUP_AUTHORS = [
  'Marco Delgado',
  'James Whitfield',
  'Luca Santini',
  'Andre Okonkwo',
  'Felix Hartmann',
  'Diego Morales',
  'Samuel Okoye',
  'Henrik Larsson',
  'Rafael Costa',
  'Oliver Pemberton',
  'Matteo Ricci',
  'Kwame Asante',
  'Sebastian Varga',
  'Nico Bergstrom',
  'Emilio Navarro',
  'Jonas Meier',
  'Carlos Mendez',
  'Hugo Fontaine',
] as const;

export type AuthorName = (typeof AUTHORS)[number];
export type WorldCupAuthorName = (typeof WORLD_CUP_AUTHORS)[number];

/** Primary beat writers per team — some authors cover multiple clubs. */
const TEAM_BEAT_WRITERS: Record<string, readonly AuthorName[]> = {
  // AL East
  NYY: ['Jake Reynolds', 'Luke Harrison'],
  BOS: ['Ryan Carter'],
  TOR: ['Tyler Brooks'],
  BAL: ['Ethan Walker'],
  TB: ['Mason Cooper'],
  // AL Central
  CLE: ['Logan Mitchell'],
  DET: ['Caleb Foster'],
  CWS: ['Owen Bennett'],
  CHW: ['Owen Bennett'],
  MIN: ['Dylan Parker'],
  KC: ['Nathan Hayes'],
  // AL West
  HOU: ['Connor Sullivan', 'Zachary Price'],
  TEX: ['Zachary Price', 'Connor Sullivan'],
  LAA: ['Hunter Collins'],
  SEA: ['Austin Grant'],
  ATH: ['Trevor Morgan'],
  OAK: ['Trevor Morgan'],
  // NL East
  ATL: ['Luke Harrison', 'Brandon Pierce'],
  MIA: ['Brandon Pierce'],
  NYM: ['Cameron Scott', 'Jake Reynolds'],
  PHI: ['Cole Richardson'],
  WSH: ['Garrett Thompson'],
  WAS: ['Garrett Thompson'],
  // NL Central
  CHC: ['Noah Daniels'],
  MIL: ['Blake Peterson', 'Noah Daniels'],
  CIN: ['Jordan Miller'],
  STL: ['Wyatt Anderson'],
  PIT: ['Evan Roberts'],
  // NL West
  LAD: ['Cameron Scott', 'Austin Grant'],
  SD: ['Cole Richardson', 'Austin Grant'],
  SF: ['Trevor Morgan', 'Garrett Thompson'],
  ARI: ['Brandon Pierce', 'Hunter Collins'],
  COL: ['Evan Roberts', 'Hunter Collins'],
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizeTeamAbbr(abbr: string): string {
  return abbr.trim().toUpperCase();
}

function beatWritersForTeam(abbr: string): readonly AuthorName[] {
  return TEAM_BEAT_WRITERS[normalizeTeamAbbr(abbr)] ?? AUTHORS;
}

function pickFromPool<T extends string>(pool: readonly T[], seed: string): T {
  const hash = hashString(seed);
  return pool[(hash >>> 4) % pool.length];
}

/**
 * Picks a beat writer for a game. Deterministic for a given seed (slug) so the
 * same matchup always gets the same author. MLB favors the home team's beat writer
 * ~75% of the time; World Cup draws from a dedicated international soccer pool.
 */
export function pickAuthorForGame(
  sport: string,
  homeTeamAbbr: string,
  awayTeamAbbr: string,
  seed: string,
): string {
  if (sport === 'world-cup') {
    return pickFromPool(WORLD_CUP_AUTHORS, seed);
  }

  const hash = hashString(seed);
  const focusHome = hash % 4 !== 0;
  const teamAbbr = focusHome ? homeTeamAbbr : awayTeamAbbr;
  const pool = beatWritersForTeam(teamAbbr);

  if (hash % 12 === 0) {
    return AUTHORS[(hash >>> 4) % AUTHORS.length];
  }

  return pool[(hash >>> 4) % pool.length];
}

export function getArticleAuthor(
  article: { author?: string | null; slug: string; sport?: string | null },
  game: { homeTeamAbbr?: string; awayTeamAbbr?: string; sport?: string },
): string {
  if (article.author?.trim()) return article.author.trim();
  const home = game.homeTeamAbbr?.trim();
  const away = game.awayTeamAbbr?.trim();
  const sport = article.sport ?? game.sport ?? 'mlb';
  const derived = home && away
    ? pickAuthorForGame(sport, home, away, article.slug)
    : sport === 'world-cup'
      ? pickFromPool(WORLD_CUP_AUTHORS, article.slug)
      : AUTHORS[hashString(article.slug) % AUTHORS.length];
  return derived || AUTHORS[0];
}

export function getAuthorInitials(name: string | null | undefined): string {
  if (!name) return 'MR';
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
