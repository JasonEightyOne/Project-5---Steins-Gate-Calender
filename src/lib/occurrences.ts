import { and, eq, gte, lte, or } from "drizzle-orm";
import type { Db } from "@/db";
import { calendars, events, type Calendar, type CalendarEvent } from "@/db/schema";
import { addDays, diffDays, isLeapYear, parseYmd, ymd } from "./dates";

export type Occurrence = {
  event: CalendarEvent;
  calendar: Calendar;
  /** Start date of this occurrence (differs from event.startDate for yearly events). */
  date: string;
  endDate: string;
};

/** Date of a yearly event in `year` (29 Feb falls back to 28 Feb in non-leap years). */
export function yearlyDateIn(startDate: string, year: number): string {
  const { m, d } = parseYmd(startDate);
  if (m === 2 && d === 29 && !isLeapYear(year)) return ymd(year, 2, 28);
  return ymd(year, m, d);
}

export function expandEvent(event: CalendarEvent, from: string, to: string): { date: string; endDate: string }[] {
  const span = diffDays(event.startDate, event.endDate);
  if (event.recurrence !== "yearly") {
    return event.startDate <= to && event.endDate >= from ? [{ date: event.startDate, endDate: event.endDate }] : [];
  }
  const out = [];
  const firstYear = Math.max(parseYmd(event.startDate).y, parseYmd(addDays(from, -span)).y);
  for (let y = firstYear; y <= parseYmd(to).y; y++) {
    const date = yearlyDateIn(event.startDate, y);
    const endDate = addDays(date, span);
    if (date < event.startDate) continue;
    if (date <= to && endDate >= from) out.push({ date, endDate });
  }
  return out;
}

/** All occurrences overlapping [from, to] (inclusive), sorted by date then time. */
export async function getOccurrences(
  db: Db,
  from: string,
  to: string,
  opts: { onlyVisible?: boolean } = {},
): Promise<Occurrence[]> {
  const rows = await db
    .select({ event: events, calendar: calendars })
    .from(events)
    .innerJoin(calendars, eq(events.calendarId, calendars.id))
    .where(
      and(
        opts.onlyVisible ? eq(calendars.visible, true) : undefined,
        or(eq(events.recurrence, "yearly"), and(lte(events.startDate, to), gte(events.endDate, from))),
      ),
    )
    .all();

  const out: Occurrence[] = [];
  for (const { event, calendar } of rows) {
    for (const o of expandEvent(event, from, to)) out.push({ event, calendar, ...o });
  }
  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      Number(b.calendar.isHoliday) - Number(a.calendar.isHoliday) ||
      (a.event.startTime ?? "").localeCompare(b.event.startTime ?? "") ||
      a.event.title.localeCompare(b.event.title),
  );
}

/** Map each day in [from, to] to the occurrences covering it (multi-day events appear on every day). */
export function groupByDay(occs: Occurrence[], from: string, to: string): Map<string, Occurrence[]> {
  const map = new Map<string, Occurrence[]>();
  for (const o of occs) {
    let d = o.date < from ? from : o.date;
    const last = o.endDate > to ? to : o.endDate;
    while (d <= last) {
      const list = map.get(d) ?? [];
      list.push(o);
      map.set(d, list);
      d = addDays(d, 1);
    }
  }
  return map;
}
