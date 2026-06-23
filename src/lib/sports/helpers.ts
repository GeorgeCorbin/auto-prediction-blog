export function safeJsonRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
  );
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function pickFromPool<T>(pool: readonly T[], seed: string): T {
  const hash = hashString(seed);
  return pool[(hash >> 4) % pool.length];
}

export function pickIndexFromPool(length: number, seed: string): number {
  if (length <= 0) return 0;
  return hashString(seed) % length;
}
