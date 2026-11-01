/**
 * Subject colours derive from the subject code, so the same code is the same
 * colour everywhere without storing anything. The palette is curated rather
 * than hashed: every hue is chosen to sit beside the iOS system blue without
 * competing with it (no blue, indigo, cyan or sky), and each entry carries a
 * vivid accent for tints plus a darker text tone that passes 4.5:1.
 */

type SubjectTone = { accent: string; text: string };

const PALETTE: readonly SubjectTone[] = [
  { accent: "#059669", text: "#065f46" }, // emerald
  { accent: "#65a30d", text: "#365314" }, // lime
  { accent: "#ca8a04", text: "#713f12" }, // gold
  { accent: "#ea580c", text: "#9a3412" }, // orange
  { accent: "#dc2626", text: "#991b1b" }, // red
  { accent: "#db2777", text: "#9d174d" }, // pink
  { accent: "#9333ea", text: "#6b21a8" }, // purple
  { accent: "#78716c", text: "#44403c" }, // stone
] as const;

const NEUTRAL: SubjectTone = PALETTE[7];

function hash(code: string): number {
  let value = 0;
  for (let i = 0; i < code.length; i += 1) {
    value = (value * 31 + code.charCodeAt(i)) >>> 0;
  }
  return value;
}

function tone(code: string | null | undefined): SubjectTone {
  if (!code) return NEUTRAL;
  return PALETTE[hash(code) % PALETTE.length];
}

/** Readable text tone for a subject code. */
export function subjectColor(code: string | null | undefined): string {
  return tone(code).text;
}

/** Vivid accent used for dots, rules and tinted backgrounds. */
export function subjectAccent(code: string | null | undefined): string {
  return tone(code).accent;
}

/**
 * Sets `--sc` (text) and `--sc-accent` (vivid); `.subject-chip` in globals.css
 * turns those into a readable label with a tinted background in both themes.
 */
export function subjectStyle(
  code: string | null | undefined,
): React.CSSProperties {
  const { accent, text } = tone(code);
  return {
    "--sc": text,
    "--sc-accent": accent,
  } as React.CSSProperties;
}
