/**
 * Date handling for a Thai school.
 *
 * Due dates are stored as `YYYY-MM-DD` strings, not instants, so there is no
 * UTC conversion anywhere in the read/write path. Timezone only matters for
 * answering "what is today" and "what time is it in Bangkok".
 */

export const TZ = "Asia/Bangkok";

const isoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** '2026-10-30' for the current moment in Bangkok. */
export function todayISO(): string {
  return isoDate.format(new Date());
}

export function nowBangkokParts(): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { hour, minute };
}

export function minutesSinceMidnightBangkok(): number {
  const { hour, minute } = nowBangkokParts();
  return hour * 60 + minute;
}

/** Pure date arithmetic on ISO strings; no Date/timezone involved. */
export function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayOfWeekISO(iso: string): number {
  // 1 = Monday … 7 = Sunday
  const date = new Date(`${iso}T12:00:00Z`);
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T12:00:00Z`);
  const b = Date.parse(`${toISO}T12:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

const DAY_NAMES = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
] as const;

const MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

const MONTHS_LONG = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

/** '2026-10' for a date-only ISO string. */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/** 'ตุลาคม 2026' — always ค.ศ. */
export function formatThaiMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const index = Math.min(Math.max((month ?? 1) - 1, 0), 11);
  return `${MONTHS_LONG[index]} ${year}`;
}

/** 'ตุลาคม' without the year. */
export function monthName(monthKey: string): string {
  const month = Number(monthKey.split("-")[1]);
  return MONTHS_LONG[Math.min(Math.max(month - 1, 0), 11)];
}

/** Pure month arithmetic on `YYYY-MM` keys. */
export function addMonthsToKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const zero = (month ?? 1) - 1 + delta;
  const nextYear = (year ?? 1970) + Math.floor(zero / 12);
  const nextMonth = ((zero % 12) + 12) % 12;
  return `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}`;
}

/** Number of days in a `YYYY-MM` month. */
export function daysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, month ?? 1, 0)).getUTCDate();
}

/** 1 = จันทร์ */
export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[(dayOfWeek - 1 + 7) % 7];
}

/** ค.ศ. always — a Buddhist-era year here would be a silent, confusing bug. */
export function formatThaiDate(iso: string, withYear = false): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const day = date.getUTCDate();
  const month = MONTHS_SHORT[date.getUTCMonth()];
  return withYear ? `${day} ${month} ${date.getUTCFullYear()}` : `${day} ${month}`;
}

/** 'ศุกร์ 30 ต.ค. 2026' */
export function formatThaiDateLong(iso: string): string {
  return `${dayName(dayOfWeekISO(iso))} ${formatThaiDate(iso, true)}`;
}

/** 'ศุกร์ 30 ต.ค.' by default, or with ค.ศ. when asked. */
export function formatThaiDateWithDay(iso: string, withYear = false): string {
  return `${dayName(dayOfWeekISO(iso))} ${formatThaiDate(iso, withYear)}`;
}

/** Relative label used by task groups and the digest. */
export function relativeDateLabel(iso: string, today = todayISO()): string {
  if (iso === today) return "วันนี้";
  if (iso === addDaysISO(today, 1)) return "พรุ่งนี้";
  if (iso === addDaysISO(today, -1)) return "เมื่อวาน";
  return formatThaiDate(iso);
}

/** '10:25' → 625 */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}
