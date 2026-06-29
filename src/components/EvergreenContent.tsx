/**
 * Renders evergreen article content which may contain light markdown:
 *   ## Heading 2
 *   ### Heading 3
 *   **bold text**
 *   - bullet list items
 *   * bullet list items
 *   1. numbered list items
 *   Regular paragraph text
 *
 * Each block (separated by blank lines) is classified and styled appropriately.
 * Single short lines without punctuation endings are heuristically treated as headings.
 */

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; ordered: boolean; items: InlinePart[][] }
  | { type: 'numbered-ranking'; items: { rank: string; parts: InlinePart[] }[] }
  | { type: 'paragraph'; parts: InlinePart[] };

type InlinePart = { bold: boolean; text: string };

function parseInline(raw: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    if (m.index > last) parts.push({ bold: false, text: raw.slice(last, m.index) });
    parts.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < raw.length) parts.push({ bold: false, text: raw.slice(last) });
  return parts;
}

/** Detect if a single-line block looks like a section heading (heuristic). */
function looksLikeHeading(raw: string): boolean {
  if (raw.includes('\n')) return false;
  if (raw.length > 80) return false;
  if (raw.endsWith('.') || raw.endsWith('!') || raw.endsWith('?')) return false;
  if (/^[A-Z]/.test(raw) && !raw.includes('. ')) return true;
  return false;
}

/** Detect if a block is a bullet/dash list */
function isList(raw: string): boolean {
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((l) => /^[\-\*•]\s/.test(l.trim()));
}

/** Detect if a block is an ordered/numbered list */
function isOrderedList(raw: string): boolean {
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length < 2) return false;
  return lines.every((l) => /^\d+[\.\)]\s/.test(l.trim()));
}

/** Detect inline bullet pattern: " * item * item * item" */
function hasInlineBullets(raw: string): boolean {
  const bullets = raw.split(/\s\*\s/).length - 1;
  return bullets >= 2 && !raw.includes('\n');
}

function parseBlocks(content: string): Block[] {
  return content
    .split(/\n\n+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw): Block => {
      // Explicit markdown headings
      if (raw.startsWith('## ')) return { type: 'h2', text: raw.slice(3).replace(/\*\*/g, '') };
      if (raw.startsWith('### ')) return { type: 'h3', text: raw.slice(4).replace(/\*\*/g, '') };

      // Bare bold-only lines (e.g. "**1-5: The Elite**") become h3
      const bareH = raw.match(/^\*\*(.+?)\*\*\s*$/);
      if (bareH) return { type: 'h3', text: bareH[1] };

      // Heuristic heading: short single-line, starts with uppercase, no sentence-ending punctuation
      if (looksLikeHeading(raw)) {
        return { type: 'h3', text: raw.replace(/\*\*/g, '').replace(/^#+\s*/, '') };
      }

      // Unordered list (multi-line with - or * prefix)
      if (isList(raw)) {
        const items = raw
          .split('\n')
          .filter(Boolean)
          .map((l) => parseInline(l.replace(/^[\-\*•]\s+/, '')));
        return { type: 'list', ordered: false, items };
      }

      // Ordered list (multi-line with 1. 2. etc.)
      if (isOrderedList(raw)) {
        const lines = raw.split('\n').filter(Boolean);
        // Check if these look like rankings (number + team name pattern)
        const isRanking = lines.some((l) => /^\d+\.\s.*\(\d+-\d+/.test(l));
        if (isRanking) {
          const items = lines.map((l) => {
            const match = l.match(/^(\d+)[\.\)]\s*(.*)/);
            return {
              rank: match?.[1] ?? '',
              parts: parseInline(match?.[2] ?? l),
            };
          });
          return { type: 'numbered-ranking', items };
        }
        const items = lines.map((l) => parseInline(l.replace(/^\d+[\.\)]\s+/, '')));
        return { type: 'list', ordered: true, items };
      }

      // Inline bullets: "* item * item * item" in a single paragraph
      if (hasInlineBullets(raw)) {
        const items = raw
          .split(/\s\*\s/)
          .map((s) => s.replace(/^\*\s*/, '').trim())
          .filter(Boolean)
          .map((s) => parseInline(s));
        return { type: 'list', ordered: false, items };
      }

      return { type: 'paragraph', parts: parseInline(raw) };
    });
}

interface Props {
  content: string;
  /** Ad slot element to inject after paragraph index 2 */
  midAd?: React.ReactNode;
}

export function EvergreenContent({ content, midAd }: Props) {
  const blocks = parseBlocks(content);

  let paraCount = 0;

  return (
    <div className="evergreen-body space-y-4 mb-8">
      {blocks.map((block, i) => {
        if (block.type === 'h2') {
          return (
            <h2
              key={i}
              className="font-serif text-[22px] font-bold text-[#1A1A1A] mt-8 mb-3 border-b border-[#E5E7EB] pb-2"
            >
              {block.text}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3
              key={i}
              className="font-serif text-[18px] font-bold text-[#1A1A1A] mt-6 mb-2"
            >
              {block.text}
            </h3>
          );
        }

        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return (
            <Tag
              key={i}
              className={`${
                block.ordered ? 'list-decimal' : 'list-disc'
              } pl-6 space-y-2 text-[16px] text-[#4B5563] leading-[1.75]`}
            >
              {block.items.map((item, j) => (
                <li key={j}>
                  {item.map((part, k) =>
                    part.bold ? (
                      <strong key={k} className="font-semibold text-[#1A1A1A]">
                        {part.text}
                      </strong>
                    ) : (
                      <span key={k}>{part.text}</span>
                    ),
                  )}
                </li>
              ))}
            </Tag>
          );
        }

        if (block.type === 'numbered-ranking') {
          return (
            <div key={i} className="space-y-3">
              {block.items.map((item, j) => (
                <div
                  key={j}
                  className="flex items-start gap-3 py-3 px-4 border border-[#E5E7EB] rounded bg-white"
                >
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold ${
                      j < 5
                        ? 'bg-[#FF6B2C] text-white'
                        : j < 10
                        ? 'bg-[#1A1A1A] text-white'
                        : 'bg-[#F3F4F6] text-[#4B5563]'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <p className="text-[15px] text-[#4B5563] leading-[1.7] pt-1">
                    {item.parts.map((part, k) =>
                      part.bold ? (
                        <strong key={k} className="font-semibold text-[#1A1A1A]">
                          {part.text}
                        </strong>
                      ) : (
                        <span key={k}>{part.text}</span>
                      ),
                    )}
                  </p>
                </div>
              ))}
            </div>
          );
        }

        // Paragraph
        paraCount++;
        const insertAd = paraCount === 3 && midAd;

        return (
          <div key={i}>
            <p className="text-[16px] text-[#4B5563] leading-[1.75]">
              {block.parts.map((part, j) =>
                part.bold ? (
                  <strong key={j} className="font-semibold text-[#1A1A1A]">
                    {part.text}
                  </strong>
                ) : (
                  <span key={j}>{part.text}</span>
                ),
              )}
            </p>
            {insertAd && (
              <div className="border border-[#E5E7EB] bg-[#F3F4F6] py-2 my-6">{midAd}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
