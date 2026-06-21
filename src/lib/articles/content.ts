const PICK_CALLOUT_PREFIX =
  /^(?:\*\*)?(?:our\s+pick|final\s+pick|the\s+pick|best\s+bet|recommended\s+pick|prediction(?:\s+pick)?)\s*:?\s*/i;

const TRAILING_PICK_CALLOUT =
  /\s*(?:\n\s*)?(?:\*\*)?(?:our\s+pick|final\s+pick|the\s+pick|best\s+bet|recommended\s+pick|prediction(?:\s+pick)?)\s*:?\s*.+?(?:\*\*)?\s*$/i;

function normalizeText(text: string): string {
  return text.replace(/\*\*/g, '').replace(/^#+\s*/, '').trim().toLowerCase();
}

function isStandalonePickCallout(paragraph: string): boolean {
  return PICK_CALLOUT_PREFIX.test(paragraph.trim());
}

function isPickOnlyParagraph(paragraph: string, pick: string): boolean {
  const normalized = normalizeText(paragraph);
  const normalizedPick = normalizeText(pick);
  return normalized === normalizedPick;
}

function stripTrailingPickCallout(paragraph: string): string {
  return paragraph.replace(TRAILING_PICK_CALLOUT, '').trim();
}

/**
 * Removes redundant pick callouts from article body text. The formatted Best Bet
 * box already displays the pick, so standalone "OUR PICK:" / "Final Pick:" lines
 * are stripped from generated and stored content.
 */
export function stripRedundantPickCallouts(content: string, pick: string): string {
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !isStandalonePickCallout(p))
    .filter((p) => !isPickOnlyParagraph(p, pick))
    .map((p) => stripTrailingPickCallout(p))
    .filter(Boolean);

  return paragraphs.join('\n\n');
}
