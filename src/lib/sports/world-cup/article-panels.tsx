import type { Game } from '@prisma/client';
import {
  formatVenueString,
  formatWatchString,
  parseWorldCupSportData,
} from './schema';

function FormBadge({ result }: { result: string }) {
  const color =
    result === 'W'
      ? 'bg-green-100 text-green-800'
      : result === 'D'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex w-6 h-6 items-center justify-center text-[11px] font-bold rounded ${color}`}>
      {result}
    </span>
  );
}

function hasWdlForm(form: string | null | undefined): boolean {
  return Boolean(form?.replace(/[^WDL]/gi, ''));
}

function RecentFormBadges({ form }: { form?: string | null }) {
  const letters = (form ?? '').replace(/[^WDL]/gi, '').toUpperCase().split('').slice(-5);
  if (letters.length === 0) {
    return <span className="text-[12px] text-[#9CA3AF]">N/A</span>;
  }
  return (
    <div className="flex gap-1">
      {letters.map((r, i) => (
        <FormBadge key={i} result={r} />
      ))}
    </div>
  );
}

function TeamPerformanceRow({
  team,
  form,
  record,
}: {
  team: string;
  form?: string | null;
  record?: string | null;
}) {
  const hasForm = hasWdlForm(form);
  const hasRecord = Boolean(record?.trim());

  if (!hasForm && !hasRecord) return null;

  return (
    <div className="py-4 border-b border-[#E5E7EB] last:border-0">
      <p className="text-[14px] font-semibold text-[#1A1A1A] mb-3">{team}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-1.5">
            Recent form
          </p>
          <p className="text-[11px] text-[#9CA3AF] mb-2">Last 5 matches (all competitions)</p>
          <RecentFormBadges form={form} />
        </div>
        <div className="rounded border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-1.5">
            World Cup record
          </p>
          <p className="text-[11px] text-[#9CA3AF] mb-2">W-D-L in this tournament</p>
          <p className="text-[15px] font-bold font-mono text-[#1A1A1A]">
            {hasRecord ? record : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WorldCupArticlePanels({ game }: { game: Game }) {
  const wcData = parseWorldCupSportData(game.sportData);
  const watchString = formatWatchString(wcData.broadcasts);
  const venueString = formatVenueString(wcData);
  const hasWatch = watchString !== 'N/A';
  const hasVenue = venueString !== 'N/A';
  const awayHasFormOrRecord =
    hasWdlForm(wcData.formAway) || Boolean(wcData.recordAway?.trim());
  const homeHasFormOrRecord =
    hasWdlForm(wcData.formHome) || Boolean(wcData.recordHome?.trim());
  const hasFormSection = awayHasFormOrRecord || homeHasFormOrRecord;
  const hasContext =
    hasFormSection ||
    wcData.groupName ||
    wcData.stage ||
    wcData.gameNote ||
    hasWatch ||
    hasVenue;

  if (!hasContext) return null;

  return (
    <section className="mb-8">
      <h2 className="font-serif text-[22px] font-bold text-[#1A1A1A] mb-4">
        Tournament Context
      </h2>
      <div className="border border-[#E5E7EB] rounded overflow-hidden p-5 bg-[#F9FAFB]">
        {(wcData.stage || wcData.groupName) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {wcData.stage && (
              <span className="inline-flex items-center bg-[#FEF3EE] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#FF6B2C] rounded-sm">
                {wcData.stage}
              </span>
            )}
            {wcData.groupName && (
              <span className="inline-flex items-center bg-white border border-[#E5E7EB] px-2.5 py-1 text-[11px] font-semibold text-[#4B5563] rounded-sm">
                {wcData.groupName}
              </span>
            )}
          </div>
        )}
        {wcData.gameNote && (
          <p className="text-[13px] text-[#4B5563] mb-4 leading-relaxed">{wcData.gameNote}</p>
        )}
        {(hasVenue || hasWatch) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {hasVenue && (
              <div className="bg-white border border-[#E5E7EB] rounded px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-1">
                  Venue
                </p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{venueString}</p>
              </div>
            )}
            {hasWatch && (
              <div className="bg-white border border-[#E5E7EB] rounded px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-1">
                  Where to Watch
                </p>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">{watchString}</p>
              </div>
            )}
          </div>
        )}
        {hasFormSection && (
          <div className="bg-white border border-[#E5E7EB] rounded px-4">
            <div className="pt-4 pb-2 border-b border-[#E5E7EB]">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">
                Team form &amp; records
              </p>
              <p className="text-[12px] text-[#6B7280] mt-1 leading-relaxed">
                Recent form reflects the last five results across all competitions. World Cup
                record is this team&apos;s win-draw-loss line in the tournament only.
              </p>
            </div>
            <TeamPerformanceRow
              team={game.awayTeam}
              form={wcData.formAway}
              record={wcData.recordAway}
            />
            <TeamPerformanceRow
              team={game.homeTeam}
              form={wcData.formHome}
              record={wcData.recordHome}
            />
          </div>
        )}
      </div>
    </section>
  );
}
