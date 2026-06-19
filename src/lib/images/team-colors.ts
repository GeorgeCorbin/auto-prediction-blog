/** Primary brand color per MLB team abbreviation */
export const TEAM_COLORS: Record<string, string> = {
  // AL East
  NYY: '#003087', BOS: '#BD3039', TBR: '#092C5C', TOR: '#134A8E', BAL: '#DF4601',
  // AL Central
  CLE: '#00385D', MIN: '#002B5C', KCR: '#004687', CWS: '#27251F', DET: '#0C2340',
  // AL West
  HOU: '#002D62', SEA: '#0C2C56', TEX: '#003278', OAK: '#003831', LAA: '#BA0021',
  ATH: '#003831',
  // NL East
  NYM: '#002D72', ATL: '#CE1141', PHI: '#E81828', MIA: '#00A3E0', WSN: '#AB0003',
  // NL Central
  CHC: '#0E3386', STL: '#C41E3A', MIL: '#12284B', PIT: '#27251F', CIN: '#C6011F',
  // NL West
  LAD: '#005A9C', SFG: '#FD5A1E', SF: '#FD5A1E', ARI: '#A71930', COL: '#33006F', SDP: '#2F241D',
};

export function teamColor(abbr: string): string {
  return TEAM_COLORS[abbr.toUpperCase()] ?? '#1E293B';
}

export function teamLogoUrl(abbr: string, sport: string): string {
  const league = sport === 'mlb' ? 'mlb' : sport;
  return `https://a.espncdn.com/i/teamlogos/${league}/500/${abbr.toLowerCase()}.png`;
}

export async function fetchLogoAsDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return url;
    const buf = await res.arrayBuffer();
    const mime = res.headers.get('content-type') ?? 'image/png';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return url;
  }
}
