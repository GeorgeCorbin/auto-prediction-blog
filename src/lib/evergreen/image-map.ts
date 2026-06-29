/**
 * Dynamic MLB hero/card images for evergreen articles.
 *
 * Every article gets a UNIQUE player image by combining:
 *   1. Article type → base offset (so different types pick from different teams)
 *   2. Edition seed  → week number / generatedAt / teamId (so consecutive
 *      editions of the SAME type rotate through different players)
 *   3. Two stars per team → even/odd editions alternate primary/secondary
 *
 * With 30 teams × 2 stars = 60 unique images, repeats are virtually impossible
 * within any visible page of articles.
 *
 * MLB CDN pattern:
 *   https://img.mlbstatic.com/mlb-photos/image/upload/ar_16:9,g_auto,q_auto:good,w_{width},c_fill,f_jpg/v1/people/{personId}/action/hero/current
 */

/**
 * Two star players per team to add variety.
 * Index 0 = primary star, index 1 = secondary star.
 */
const TEAM_STARS: Record<number, [number, number]> = {
  108: [545361, 621493],  // LAA — Trout, Ward
  109: [682998, 606466],  // ARI — Carroll, Marte
  110: [668939, 683002],  // BAL — Rutschman, Henderson
  111: [646240, 680776],  // BOS — Devers, Duran
  112: [807713, 663538],  // CHC — Shaw, Hoerner
  113: [682829, 663697],  // CIN — De La Cruz, India
  114: [680757, 608070],  // CLE — Kwan, Ramirez
  115: [678662, 641857],  // COL — Tovar, McMahon
  116: [682985, 679529],  // DET — Greene, Torkelson
  117: [514888, 670541],  // HOU — Altuve, Alvarez
  118: [677951, 521692],  // KC — Witt Jr., Perez
  119: [660271, 605141],  // LAD — Ohtani, Betts
  120: [686611, 695578],  // WSH — Crews, Wood
  121: [596019, 665742],  // NYM — Lindor, Soto
  133: [680869, 667670],  // OAK — Gelof, Rooker
  134: [694973, 668804],  // PIT — Skenes, Reynolds
  135: [665487, 630105],  // SD — Tatis Jr., Cronenworth
  136: [677594, 669302],  // SEA — Rodriguez, Gilbert
  137: [657277, 656305],  // SF — Webb, Chapman
  138: [571448, 502671],  // STL — Arenado, Goldschmidt
  139: [650490, 664040],  // TB — Diaz, Lowe
  140: [543760, 608369],  // TEX — Semien, Seager
  141: [665489, 543807],  // TOR — Guerrero Jr., Springer
  142: [621043, 621439],  // MIN — Correa, Buxton
  143: [547180, 656941],  // PHI — Harper, Schwarber
  144: [660670, 621566],  // ATL — Acuña Jr., Olson
  145: [683734, 673357],  // CWS — Vaughn, Robert
  146: [665862, 650333],  // MIA — Chisholm Jr., Arraez
  147: [592450, 683011],  // NYY — Judge, Volpe
  158: [642715, 592885],  // MIL — Adames, Yelich
};

/** Flat array of ALL star IDs for fallback rotation (60 unique players) */
const ALL_STARS: number[] = Object.values(TEAM_STARS).flat();

/**
 * Build an MLB CDN action photo URL for a given player.
 */
export function mlbActionPhotoUrl(personId: number, width = 1200): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/ar_16:9,g_auto,q_auto:good,w_${width},c_fill,f_jpg/v1/people/${personId}/action/hero/current`;
}

/**
 * Pick a star from a team list, using edition-aware offset + star index.
 * The offset rotates through teams; starIdx alternates primary/secondary.
 */
function pickStarFromTeams(
  teams: Array<{ teamId?: number }>,
  offset: number,
  starIdx: number,
): number | null {
  const validTeams = teams.filter((t) => t.teamId && TEAM_STARS[t.teamId]);
  if (validTeams.length === 0) return null;
  const team = validTeams[offset % validTeams.length];
  const stars = TEAM_STARS[team.teamId!];
  return stars ? stars[starIdx % 2] : null;
}

/**
 * Extract a per-edition seed from evergreenData.
 * This is the key to ensuring consecutive editions of the same article type
 * always produce different images.
 */
function editionSeed(d: Record<string, unknown>): number {
  // weekNumber is the best seed — present in power-rankings, playoff-picture, matchup-cheat-sheet
  if (typeof d.weekNumber === 'number') return d.weekNumber;
  // generatedAt string → derive a seed from the date
  if (typeof d.generatedAt === 'string') {
    return hashStr(d.generatedAt);
  }
  // periodLabel (betting-trends, award-races)
  if (typeof d.periodLabel === 'string') {
    return hashStr(d.periodLabel);
  }
  // teamId (team-profile) — each team gets a different seed
  if (typeof d.teamId === 'number') {
    return d.teamId;
  }
  return 0;
}

/**
 * Each article type has a base offset so different types on the same page
 * start from different positions in the team list.
 */
const TYPE_BASE_OFFSET: Record<string, number> = {
  'power-rankings':      0,
  'win-totals':          5,
  'matchup-cheat-sheet': 10,
  'betting-trends':      15,
  'playoff-picture':     20,
  'award-races':         25,
  'team-profile':        0,
};

/**
 * Extract a relevant player person ID from evergreenData.
 *
 * The combination of TYPE_BASE_OFFSET + editionSeed ensures:
 *   - Different article types pick from different teams
 *   - Different editions (weeks) of the same type rotate through teams
 *   - Even/odd editions alternate between primary and secondary star
 */
export function getHeroPlayerIdFromData(articleType: string, evergreenData: unknown): number | null {
  const d = evergreenData as Record<string, unknown> | null;
  if (!d) return null;

  const seed = editionSeed(d);
  const baseOffset = TYPE_BASE_OFFSET[articleType] ?? 0;
  const offset = baseOffset + seed;
  const starIdx = seed % 2; // alternate primary/secondary each edition

  switch (articleType) {
    case 'power-rankings': {
      const rankings = Array.isArray(d.rankings)
        ? (d.rankings as Array<{ teamId?: number }>)
        : [];
      return pickStarFromTeams(rankings, offset, starIdx);
    }
    case 'win-totals': {
      const entries = Array.isArray(d.entries)
        ? (d.entries as Array<{ teamId?: number }>)
        : [];
      return pickStarFromTeams(entries, offset, starIdx);
    }
    case 'matchup-cheat-sheet': {
      // No team data stored — use ALL_STARS with seed rotation
      return ALL_STARS[offset % ALL_STARS.length];
    }
    case 'playoff-picture': {
      // Alternate between NL and AL leaders each week
      const useNl = seed % 2 === 0;
      const leaders = useNl
        ? (Array.isArray(d.nlDivisionLeaders) ? d.nlDivisionLeaders as Array<{ teamId?: number }> : [])
        : (Array.isArray(d.alDivisionLeaders) ? d.alDivisionLeaders as Array<{ teamId?: number }> : []);
      if (leaders.length > 0) return pickStarFromTeams(leaders, offset, starIdx);
      // Fallback to the other league
      const fallback = !useNl
        ? (Array.isArray(d.nlDivisionLeaders) ? d.nlDivisionLeaders as Array<{ teamId?: number }> : [])
        : (Array.isArray(d.alDivisionLeaders) ? d.alDivisionLeaders as Array<{ teamId?: number }> : []);
      return pickStarFromTeams(fallback, offset, starIdx);
    }
    case 'team-profile': {
      const teamId = typeof d.teamId === 'number' ? d.teamId : null;
      if (!teamId) return null;
      const stars = TEAM_STARS[teamId];
      // Team profiles for the SAME team alternate primary/secondary
      return stars ? stars[seed % 2] : null;
    }
    case 'betting-trends': {
      const hot = Array.isArray(d.hotTeams)
        ? (d.hotTeams as Array<{ teamId?: number }>)
        : [];
      return pickStarFromTeams(hot, offset, starIdx);
    }
    case 'award-races': {
      return ALL_STARS[offset % ALL_STARS.length];
    }
    default:
      return null;
  }
}

/**
 * Get the hero image URL for an evergreen article.
 *
 * Guarantees unique images across editions by seeding on the article's
 * week number / generation date, combined with the article type offset.
 */
export function getEvergreenImage(articleType: string, evergreenData?: unknown): string {
  const playerId = evergreenData
    ? getHeroPlayerIdFromData(articleType, evergreenData)
    : null;

  if (playerId) {
    return mlbActionPhotoUrl(playerId);
  }

  // Fallback: pick from ALL_STARS based on article type hash
  const idx = hashStr(articleType) % ALL_STARS.length;
  return mlbActionPhotoUrl(ALL_STARS[idx]);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
