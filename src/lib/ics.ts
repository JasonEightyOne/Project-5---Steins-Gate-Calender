import ical, { type VEvent } from "node-ical";
import { APP_TZ, addDays, ymd, zonedParts } from "./dates";

export type ImportedEvent = {
  uid: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string; // inclusive
  startTime: string | null;
};

type Window = { from: Date; to: Date };

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "val" in v) return String((v as { val: unknown }).val ?? "");
  return String(v);
}

/** node-ical builds DATE values at local midnight of the *process*, so read them with local getters. */
function localDate(d: Date): string {
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function toEvent(v: VEvent, uid: string, start: Date, durationMs: number): ImportedEvent {
  const allDay = v.datetype === "date";
  const title = text(v.summary).trim() || "(untitled)";
  const description = text(v.description).trim() || null;
  if (allDay) {
    const startDate = localDate(start);
    const days = Math.max(1, Math.round(durationMs / 86_400_000));
    return { uid, title, description, startDate, endDate: addDays(startDate, days - 1), startTime: null };
  }
  const s = zonedParts(start, APP_TZ);
  const e = zonedParts(new Date(start.getTime() + Math.max(0, durationMs - 1)), APP_TZ);
  return { uid, title, description, startDate: s.date, endDate: e.date < s.date ? s.date : e.date, startTime: s.time };
}

/**
 * Parse iCalendar text into flat events. Recurring events (RRULE) are expanded
 * into one event per occurrence inside `window` (default: 1 year back, 3 years ahead).
 */
export function parseIcs(icsText: string, window?: Window): ImportedEvent[] {
  if (!/BEGIN:VCALENDAR/i.test(icsText)) throw new Error("Not an iCalendar (.ics) file");
  const now = Date.now();
  const win = window ?? { from: new Date(now - 365 * 86_400_000), to: new Date(now + 3 * 365 * 86_400_000) };
  const data = ical.sync.parseICS(icsText);
  const out: ImportedEvent[] = [];

  for (const [key, comp] of Object.entries(data)) {
    if (!comp || comp.type !== "VEVENT") continue;
    const v = comp as VEvent;
    if (!v.start) continue;
    if (String(v.status ?? "").toUpperCase() === "CANCELLED") continue;
    const uid = v.uid || key;
    const start = new Date(v.start);
    const end = v.end ? new Date(v.end) : null;
    const durationMs = end ? end.getTime() - start.getTime() : v.datetype === "date" ? 86_400_000 : 0;

    if (v.rrule) {
      const excluded = new Set(
        Object.values(v.exdate ?? {}).map((d) => (v.datetype === "date" ? localDate(d as Date) : (d as Date).toISOString())),
      );
      for (const occ of v.rrule.between(win.from, win.to, true)) {
        const ev = toEvent(v, "", occ, durationMs);
        const exKey = v.datetype === "date" ? ev.startDate : occ.toISOString();
        if (excluded.has(exKey)) continue;
        out.push({ ...ev, uid: `${uid}::${ev.startDate}` });
      }
    } else {
      out.push(toEvent(v, uid, start, durationMs));
    }
  }
  return out.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function normalizeIcsUrl(url: string): string {
  return url.trim().replace(/^webcals?:\/\//i, "https://");
}

export async function fetchIcs(url: string): Promise<string> {
  const res = await fetch(normalizeIcsUrl(url), {
    headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  return res.text();
}
