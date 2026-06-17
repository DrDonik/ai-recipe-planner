/**
 * Parses recipe instruction text into segments, detecting human-readable time
 * durations ("5 minutes", "3-4 min", "1½ hours", "30 seconds") across all four
 * supported languages (English, German, Spanish, French) so the UI can turn
 * them into one-tap cooking timers.
 *
 * Anything not recognised as a duration is returned as plain text, so callers
 * can render unmatched phrases ("a few minutes", "overnight") unchanged.
 */

export interface TextSegment {
  type: 'text';
  text: string;
}

export interface TimerSegment {
  type: 'timer';
  /** The exact matched text, e.g. "3-4 minutes". Shown on the chip. */
  text: string;
  /** Duration in milliseconds. For ranges, the longer end is used. */
  durationMs: number;
}

export type InstructionSegment = TextSegment | TimerSegment;

const FRACTIONS: Record<string, number> = {
  '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75,
  '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅛': 0.125,
};
const FRACTION_CHARS = Object.keys(FRACTIONS).join('');

// A number: digits with optional decimal and/or a trailing fraction glyph
// ("1½", "1.5", "1,5"), or a lone fraction glyph ("½").
const NUMBER = `(?:\\d+(?:[.,]\\d+)?\\s*[${FRACTION_CHARS}]?|[${FRACTION_CHARS}])`;

// Optional second number forming a range ("3-4", "3 to 4", "3 bis 4", "3 à 4").
const RANGE = `(?:\\s*(?:-|–|—|to|bis|à)\\s*(${NUMBER}))?`;

// Unit words across EN/DE/ES/FR. Longer alternatives come first so "minutes"
// wins over a bare "min". Bare single letters ("h", "s") are matched last and
// are protected by the trailing word boundary in the full pattern.
const UNIT = [
  'hours?', 'hrs?', 'stunden?', 'std', 'horas?', 'heures?', 'h',
  'minutes?', 'mins?', 'minuten?', 'minutos?', 'min',
  'seconds?', 'secs?', 'sekunden?', 'segundos?', 'secondes?', 'sek', 'seg', 's',
].join('|');

const TIMER_REGEX = new RegExp(`(${NUMBER})${RANGE}\\s*(${UNIT})\\b`, 'giu');

/** Parses a single number token, including an optional trailing fraction glyph. */
function parseSingleNumber(raw: string): number {
  let s = raw.trim();
  let frac = 0;
  const last = s[s.length - 1];
  if (last && last in FRACTIONS) {
    frac = FRACTIONS[last];
    s = s.slice(0, -1).trim();
  }
  const base = s ? parseFloat(s.replace(',', '.')) : 0;
  return (Number.isNaN(base) ? 0 : base) + frac;
}

/** Returns the millisecond multiplier for a matched unit token. */
function unitToMs(unitRaw: string): number {
  const u = unitRaw.toLowerCase();
  if (/^(?:h|hrs?|hours?|stunden?|std|horas?|heures?)$/.test(u)) return 3_600_000;
  if (/^(?:min|mins?|minutes?|minuten?|minutos?)$/.test(u)) return 60_000;
  return 1_000; // seconds (sec, secs, sek, seg, s, segundos, secondes, …)
}

/**
 * Formats a duration in milliseconds as a clock string: "M:SS", or "H:MM:SS"
 * once an hour or more remains. Used both for the inline countdown and the tray.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * Splits an instruction string into ordered text and timer segments.
 * Matched durations become {@link TimerSegment}s; everything else stays text.
 */
export function parseInstruction(text: string): InstructionSegment[] {
  const segments: InstructionSegment[] = [];
  let lastIndex = 0;
  TIMER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TIMER_REGEX.exec(text)) !== null) {
    const [matched, n1, n2, unit] = match;
    const value = Math.max(parseSingleNumber(n1), n2 ? parseSingleNumber(n2) : 0);
    const durationMs = Math.round(value * unitToMs(unit));

    // Leave non-positive durations as plain text (they'll be folded into the
    // next text slice since lastIndex isn't advanced past them).
    if (durationMs <= 0) continue;

    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'timer', text: matched, durationMs });
    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) });
  }
  return segments;
}
