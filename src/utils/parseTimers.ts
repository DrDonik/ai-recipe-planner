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
  /** The sentence of the instruction containing the match. Used as the timer's label. */
  sentence: string;
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

// Abbreviations (lowercased, sans period) that commonly precede a period
// mid-sentence in recipe text across EN/DE/ES/FR, so a period after them is
// not a sentence boundary. Single letters ("z.", "B.") are excluded generically.
const ABBREVIATIONS = new Set([
  'ca', 'bzw', 'evtl', 'ggf', 'inkl', 'min', 'sek', 'std', 'tl', 'el', 'msp', 'pck', 'st', 'stk', // DE
  'approx', 'etc', 'oz', 'lb', 'lbs', 'tbsp', 'tsp', 'no', 'pkg', 'pkgs', 'fl', 'qt', 'pt', 'gal', // EN
  'aprox', 'cda', 'cdta', 'núm', // ES
  'env', 'càs', 'càc', 'cuil', 'pers', // FR
]);

/**
 * Whether the period at `text[i]` ends a sentence. Errs on the side of "no":
 * a missed boundary only makes the extracted sentence longer, never wrong.
 */
function isSentenceEndingPeriod(text: string, i: number): boolean {
  // The word directly before the period must not be an abbreviation. Single
  // letters count as abbreviations/initials ("z. B.", "°C.").
  let w = i;
  while (w > 0 && /\p{L}/u.test(text[w - 1])) w--;
  const word = text.slice(w, i);
  if (word.length === 1 || ABBREVIATIONS.has(word.toLowerCase())) return false;

  // The period must be followed by whitespace and an uppercase letter (a
  // following digit or lowercase letter means "ca. 10", "1.5", "10 Min. mehr").
  let j = i + 1;
  while (j < text.length && /["'’”“‘«»‹›)\]}]/.test(text[j])) j++;
  if (j >= text.length) return true;
  if (!/\s/.test(text[j])) return false;
  while (j < text.length && /\s/.test(text[j])) j++;
  return j >= text.length || /\p{Lu}/u.test(text[j]);
}

/** Whether `text[i]` is a sentence boundary. */
const isBoundary = (text: string, i: number): boolean => {
  const ch = text[i];
  return ch === '\n' || ch === '!' || ch === '?' || (ch === '.' && isSentenceEndingPeriod(text, i));
};

/**
 * Extracts the sentence of `text` containing the range [start, end). Used to
 * label a timer with just the instruction sentence its time phrase sits in,
 * e.g. "Die Sauce ca. 10 Minuten köcheln lassen." out of a multi-sentence step.
 */
export function extractSentence(text: string, start: number, end: number): string {
  let from = 0;
  for (let i = start - 1; i >= 0; i--) {
    if (isBoundary(text, i)) {
      from = i + 1;
      break;
    }
  }
  // Skip the previous sentence's trailing quotes/brackets (e.g. `…rühren.“ Die`).
  while (from < start && /["'’”“‘«»‹›)\]}\s]/.test(text[from])) from++;
  let to = text.length;
  for (let i = end; i < text.length; i++) {
    if (isBoundary(text, i)) {
      to = text[i] === '\n' ? i : i + 1;
      break;
    }
  }
  return text.slice(from, to).trim();
}

/**
 * Splits an instruction string into ordered text and timer segments.
 * Matched durations become {@link TimerSegment}s; everything else stays text.
 */
export function parseInstruction(text: string | null | undefined): InstructionSegment[] {
  const safeText = text ?? '';
  const segments: InstructionSegment[] = [];
  let lastIndex = 0;
  TIMER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TIMER_REGEX.exec(safeText)) !== null) {
    const [matched, n1, n2, unit] = match;
    const value = Math.max(parseSingleNumber(n1), n2 ? parseSingleNumber(n2) : 0);
    const durationMs = Math.round(value * unitToMs(unit));

    // Leave non-positive durations as plain text (they'll be folded into the
    // next text slice since lastIndex isn't advanced past them).
    if (durationMs <= 0) continue;

    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: safeText.slice(lastIndex, match.index) });
    }
    lastIndex = match.index + matched.length;
    segments.push({
      type: 'timer',
      text: matched,
      durationMs,
      sentence: extractSentence(safeText, match.index, lastIndex),
    });
  }

  if (lastIndex < safeText.length) {
    segments.push({ type: 'text', text: safeText.slice(lastIndex) });
  }
  return segments;
}
