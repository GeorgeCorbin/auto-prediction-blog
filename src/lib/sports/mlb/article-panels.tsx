import type { Game } from '@prisma/client';
import { parseMlbSportData } from './schema';

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

export function MlbArticlePanels({ game }: { game: Game }) {
  const mlbData = parseMlbSportData(game.sportData);
  const homeStats = parsePitcherStats(mlbData.homePitcherStats);
  const awayStats = parsePitcherStats(mlbData.awayPitcherStats);
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
          stats={awayStats}
        />
        <div className="flex items-center justify-center bg-[#E5E7EB]">
          <span className="text-[11px] font-bold text-[#9CA3AF] tracking-widest [writing-mode:vertical-lr]">
            VS
          </span>
        </div>
        <PitcherPanel
          team={game.homeTeam}
          pitcher={mlbData.homePitcher ?? null}
          stats={homeStats}
        />
      </div>
    </section>
  );
}
