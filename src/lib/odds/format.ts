export function formatAmericanOdds(val: number | null | undefined): string | null {
  if (val == null) return null;
  return val > 0 ? `+${val}` : `${val}`;
}

export function formatSpreadPoint(val: number | null | undefined): string | null {
  if (val == null) return null;
  return val > 0 ? `+${val}` : `${val}`;
}
