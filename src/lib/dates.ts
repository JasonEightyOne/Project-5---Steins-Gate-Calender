/** Date helpers. Calendar dates are plain "YYYY-MM-DD" strings in the app time zone. */

export const APP_TZ = process.env.APP_TIMEZONE || "Asia/Kuala_Lumpur";

const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseYmd(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

export function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { y, m, d } = parseYmd(s);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function addDays(s: string, n: number): string {
  const { y, m, d } = parseYmd(s);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = parseYmd(from);
  const b = parseYmd(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/** 0 = Sunday. */
export function dayOfWeek(s: string): number {
  const { y, m, d } = parseYmd(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Wall-clock date and time of an instant in a time zone. */
export function zonedParts(instant: Date, tz = APP_TZ): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function todayIn(tz = APP_TZ, now = new Date()): string {
  return zonedParts(now, tz).date;
}

function tzOffsetMs(tz: string, utcMs: number): number {
  const { date, time } = zonedParts(new Date(utcMs), tz);
  const { y, m, d } = parseYmd(date);
  const [hh, mm] = time.split(":").map(Number);
  const flooredToMinute = Math.floor(utcMs / 60_000) * 60_000;
  return Date.UTC(y, m - 1, d, hh, mm) - flooredToMinute;
}

/** The instant at which the wall clock in `tz` reads `date` `time`. */
export function zonedToUtc(date: string, time: string, tz = APP_TZ): Date {
  const { y, m, d } = parseYmd(date);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = tzOffsetMs(tz, guess);
  let result = guess - off1;
  const off2 = tzOffsetMs(tz, result);
  if (off2 !== off1) result = guess - off2;
  return new Date(result);
}

/** 6 rows x 7 days covering the month, weeks starting Sunday. */
export function monthGrid(year: number, month: number): string[][] {
  const first = ymd(year, month, 1);
  let cursor = addDays(first, -dayOfWeek(first));
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const idx = year * 12 + (month - 1) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatLong(s: string): string {
  const { y, m, d } = parseYmd(s);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek(s)];
  return `${wd}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function describeOffset(minutes: number): string {
  if (minutes === 0) return "at start";
  if (minutes % 10080 === 0) return `${minutes / 10080} week${minutes === 10080 ? "" : "s"} before`;
  if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? "" : "s"} before`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"} before`;
  return `${minutes} min before`;
}
