import type { Game } from '@prisma/client';
import { parseMlbSportData } from './schema';
import { safeJsonRecord } from '@/lib/sports/helpers';

type RichStats = {
  avg?: string | null;
  obp?: string | null;
  slg?: string | null;
  ops?: string | null;
  runsPerGame?: string | null;
  homeRuns?: number | null;
  era?: string | null;
  whip?: string | null;
  kPer9?: string | null;
  oppAvg?: string | null;
};

function richStr(rich: RichStats | null | undefined, key: keyof RichStats): string | null {
  if (!rich) return null;
  const v = rich[key];
  return v != null ? String(v) : null;
}

/* ─── Types ───────────────────────────────────────────────────── */

type PitcherStats = {
  record: string | null;
  throws: string | null;
  ERA: string | null;
  WHIP: string | null;
  IP: string | null;
  K: string | null;
  BB: string | null;
  H: string | null;
  HR: string | null;
};

/* ─── Helpers ─────────────────────────────────────────────────── */

function parsePitcherStats(raw: unknown): PitcherStats {
  const empty: PitcherStats = {
    record: null,
    throws: null,
    ERA: null,
    WHIP: null,
    IP: null,
    K: null,
    BB: null,
    H: null,
    HR: null,
  };
  if (!raw || typeof raw !== 'object') return empty;
  const s = raw as Record<string, unknown>;

  const str = (key: string): string | null => {
    const v = s[key];
    return v != null ? String(v) : null;
  };

  let record = str('record');
  if (record) {
    const m = record.match(/\(?([\d]+-[\d]+)/);
    record = m ? m[1] : record.replace(/^\(/, '').replace(/,.*$/, '').trim();
  } else if (str('W') && str('L')) {
    record = `${str('W')}-${str('L')}`;
  }

  let ip = str('IP');
  if (!ip) {
    const fi = parseFloat(str('FI') ?? '0');
    const pi = parseFloat(str('PI') ?? '0');
    if (fi > 0 || pi > 0) ip = (fi + pi / 3).toFixed(1);
  }

  return {
    record,
    throws: str('throws'),
    ERA: str('ERA') ?? str('era'),
    WHIP: str('WHIP'),
    IP: ip,
    K: str('K'),
    BB: str('BB'),
    H: str('H'),
    HR: str('HR'),
  };
}

function perNine(stat: string | null, ip: string | null): string | null {
  const s = parseFloat(stat ?? '');
  const i = parseFloat(ip ?? '');
  if (!isFinite(s) || !isFinite(i) || i === 0) return null;
  return ((s / i) * 9).toFixed(1);
}

function getStatStr(stats: Record<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const v = stats[key];
    if (v != null && v !== '') return String(v);
  }
  return null;
}

/* ─── Sub-components ──────────────────────────────────────────── */

function PitcherStat({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center py-2 border-b border-[#E5E7EB] last:border-0">
      <span className="text-[12px] text-[#9CA3AF]">{label}</span>
      <span className="ml-auto font-mono text-[13px] font-bold text-[#1A1A1A]">
        {value ?? '—'}
      </span>
    </div>
  );
}

function PitcherPanel({
  team,
  pitcher,
  stats,
}: {
  team: string;
  pitcher: string | null;
  stats: PitcherStats;
}) {
  const handPrefix = stats.throws ? `${stats.throws}HP ` : '';
  const k9 = perNine(stats.K, stats.IP);
  const bb9 = perNine(stats.BB, stats.IP);
  return (
    <div className="p-5 bg-[#F9FAFB]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#4B5563] mb-1">{team}</p>
      <p className="font-serif text-[17px] font-bold text-[#1A1A1A] mb-4">
        {handPrefix}
        {pitcher ?? 'TBD'}
      </p>
      <PitcherStat label="Record" value={stats.record} />
      <PitcherStat label="ERA" value={stats.ERA} />
      {stats.WHIP && <PitcherStat label="WHIP" value={stats.WHIP} />}
      {stats.IP && <PitcherStat label="IP" value={stats.IP} />}
      {k9 && <PitcherStat label="K/9" value={k9} />}
      {bb9 && <PitcherStat label="BB/9" value={bb9} />}
    </div>
  );
}

/* ─── Inline stats widget (interlaced between article paragraphs) ─ */

interface InlineStatItem {
  label: string;
  awayVal: string | null;
  homeVal: string | null;
  lowerIsBetter?: boolean;
}

function InlineStatRow({ label, awayVal, homeVal, lowerIsBetter = false }: InlineStatItem) {
  const away = parseFloat(awayVal ?? '');
  const home = parseFloat(homeVal ?? '');
  const hasNumbers = isFinite(away) && isFinite(home) && away !== home;
  const awayEdge = hasNumbers && (lowerIsBetter ? away < home : away > home);
  const homeEdge = hasNumbers && !awayEdge;

  return (
    <div className="flex items-center py-2 border-b border-[#E5E7EB] last:border-0 gap-2">
      <span className={`font-mono text-[12px] font-bold w-12 text-right shrink-0 ${awayEdge ? 'text-[#FF6B2C]' : 'text-[#1A1A1A]'}`}>
        {awayVal ?? '—'}
      </span>
      <span className="text-[11px] text-[#9CA3AF] flex-1 text-center">{label}</span>
      <span className={`font-mono text-[12px] font-bold w-12 shrink-0 ${homeEdge ? 'text-[#FF6B2C]' : 'text-[#1A1A1A]'}`}>
        {homeVal ?? '—'}
      </span>
    </div>
  );
}

/**
 * Compact stats widget designed to be interlaced between article paragraphs.
 * Renders as a borderless aside so it reads as part of the content flow.
 */
export function MlbInlineStats({ game }: { game: Game }) {
  const mlbData = parseMlbSportData(game.sportData);
  const homeRich = mlbData.homeRichStats as RichStats | null | undefined;
  const awayRich = mlbData.awayRichStats as RichStats | null | undefined;

  const homeTeamStats = safeJsonRecord(game.homeStats);
  const awayTeamStats = safeJsonRecord(game.awayStats);

  const homeStandings = mlbData.homeStandings;
  const awayStandings = mlbData.awayStandings;

  const statDefs: InlineStatItem[] = [
    {
      label: 'Batting Avg',
      awayVal: richStr(awayRich, 'avg') ?? getStatStr(awayTeamStats, ['AVG', 'BA', 'Avg']),
      homeVal: richStr(homeRich, 'avg') ?? getStatStr(homeTeamStats, ['AVG', 'BA', 'Avg']),
    },
    {
      label: 'OBP',
      awayVal: richStr(awayRich, 'obp') ?? getStatStr(awayTeamStats, ['OBP']),
      homeVal: richStr(homeRich, 'obp') ?? getStatStr(homeTeamStats, ['OBP']),
    },
    {
      label: 'SLG',
      awayVal: richStr(awayRich, 'slg') ?? getStatStr(awayTeamStats, ['SLG']),
      homeVal: richStr(homeRich, 'slg') ?? getStatStr(homeTeamStats, ['SLG']),
    },
    {
      label: 'OPS',
      awayVal: richStr(awayRich, 'ops') ?? getStatStr(awayTeamStats, ['OPS']),
      homeVal: richStr(homeRich, 'ops') ?? getStatStr(homeTeamStats, ['OPS']),
    },
    {
      label: 'Runs / Game',
      awayVal: richStr(awayRich, 'runsPerGame') ?? getStatStr(awayTeamStats, ['Runs', 'Runs Per Game', 'R/G', 'R']),
      homeVal: richStr(homeRich, 'runsPerGame') ?? getStatStr(homeTeamStats, ['Runs', 'Runs Per Game', 'R/G', 'R']),
    },
    {
      label: 'Home Runs',
      awayVal: richStr(awayRich, 'homeRuns') ?? getStatStr(awayTeamStats, ['HR', 'Home Runs']),
      homeVal: richStr(homeRich, 'homeRuns') ?? getStatStr(homeTeamStats, ['HR', 'Home Runs']),
    },
    {
      label: 'Team ERA',
      awayVal: richStr(awayRich, 'era') ?? getStatStr(awayTeamStats, ['ERA', 'Team ERA', 'teamERA']),
      homeVal: richStr(homeRich, 'era') ?? getStatStr(homeTeamStats, ['ERA', 'Team ERA', 'teamERA']),
      lowerIsBetter: true,
    },
    {
      label: 'WHIP',
      awayVal: richStr(awayRich, 'whip') ?? getStatStr(awayTeamStats, ['WHIP']),
      homeVal: richStr(homeRich, 'whip') ?? getStatStr(homeTeamStats, ['WHIP']),
      lowerIsBetter: true,
    },
    {
      label: 'K/9',
      awayVal: richStr(awayRich, 'kPer9') ?? null,
      homeVal: richStr(homeRich, 'kPer9') ?? null,
    },
    {
      label: 'Opp AVG',
      awayVal: richStr(awayRich, 'oppAvg') ?? null,
      homeVal: richStr(homeRich, 'oppAvg') ?? null,
      lowerIsBetter: true,
    },
  ];

  const visibleStats = statDefs.filter((s) => s.awayVal || s.homeVal);
  if (visibleStats.length === 0) return null;

  const hasStandings = homeStandings || awayStandings;
  const homeLast10 = mlbData.homeLast10;
  const awayLast10 = mlbData.awayLast10;
  const homeStreak = mlbData.homeStreak;
  const awayStreak = mlbData.awayStreak;

  const usingRichSource = !!(homeRich || awayRich);

  return (
    <aside className="my-6 rounded border border-[#E5E7EB] overflow-hidden">
      <div className="flex items-center px-3 py-2 bg-[#F3F4F6] border-b border-[#E5E7EB]">
        <span className="font-semibold text-[11px] text-[#4B5563] w-12 text-right shrink-0 truncate">{game.awayTeam}</span>
        <span className="flex-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">Season Stats</span>
        <span className="font-semibold text-[11px] text-[#4B5563] w-12 shrink-0 truncate">{game.homeTeam}</span>
      </div>
      <div className="px-3 bg-white">
        {visibleStats.map((s) => (
          <InlineStatRow key={s.label} {...s} />
        ))}
      </div>
      {hasStandings && (
        <div className="px-3 bg-white border-t border-[#E5E7EB]">
          {(homeLast10 || awayLast10) && (
            <InlineStatRow label="Last 10" awayVal={awayLast10 ?? null} homeVal={homeLast10 ?? null} />
          )}
          {(homeStreak || awayStreak) && (
            <InlineStatRow label="Streak" awayVal={awayStreak ?? null} homeVal={homeStreak ?? null} />
          )}
          {(homeStandings?.gamesBack !== undefined || awayStandings?.gamesBack !== undefined) && (
            <InlineStatRow
              label="GB"
              awayVal={awayStandings?.gamesBack ?? null}
              homeVal={homeStandings?.gamesBack ?? null}
              lowerIsBetter
            />
          )}
        </div>
      )}
      <div className="px-3 py-1.5 bg-[#F9FAFB] border-t border-[#E5E7EB]">
        <p className="text-[10px] text-[#9CA3AF]">
          Season averages · Source: {usingRichSource ? 'MLB Stats API' : 'ESPN'}. Orange = statistical edge.
        </p>
      </div>
    </aside>
  );
}

/* ─── Main export (pitcher panel only) ───────────────────────── */

export function MlbArticlePanels({ game }: { game: Game }) {
  const mlbData = parseMlbSportData(game.sportData);
  const homePitcherStats = parsePitcherStats(mlbData.homePitcherStats);
  const awayPitcherStats = parsePitcherStats(mlbData.awayPitcherStats);
  const hasPitchers = mlbData.homePitcher || mlbData.awayPitcher;

  if (!hasPitchers) return null;

  return (
    <section className="mb-8">
      <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] mb-4">
        Probable Pitchers
      </h2>
      <div className="border border-[#E5E7EB] rounded overflow-hidden grid grid-cols-[1fr_48px_1fr]">
        <PitcherPanel
          team={game.awayTeam}
          pitcher={mlbData.awayPitcher ?? null}
          stats={awayPitcherStats}
        />
        <div className="flex items-center justify-center bg-[#E5E7EB]">
          <span className="text-[11px] font-bold text-[#9CA3AF] tracking-widest [writing-mode:vertical-lr]">
            VS
          </span>
        </div>
        <PitcherPanel
          team={game.homeTeam}
          pitcher={mlbData.homePitcher ?? null}
          stats={homePitcherStats}
        />
      </div>
    </section>
  );
}
