import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { calendars, deliveries, events, reminders, type Channel } from "@/db/schema";
import { APP_TZ, addDays, describeOffset, formatLong, todayIn, zonedToUtc } from "./dates";
import { send, type Message } from "./notify";
import { getOccurrences, type Occurrence } from "./occurrences";

export const ALL_DAY_TIME = process.env.ALL_DAY_REMINDER_TIME || "09:00";
/** Longest supported "before" offset (30 days); bounds how far ahead we scan. */
export const MAX_OFFSET_MINUTES = 30 * 24 * 60;
/** Reminders missed for longer than this (e.g. worker was off) are skipped instead of sent late. */
const GRACE_MS = 12 * 60 * 60 * 1000;
/** Failed sends are retried on later ticks up to this many attempts. */
export const MAX_ATTEMPTS = 3;

export type DueReminder = {
  key: string;
  channel: Channel;
  fireAt: Date;
  occurrence: Occurrence;
  minutesBefore: number;
};

export function fireTime(occ: Occurrence, minutesBefore: number, tz = APP_TZ): Date {
  const start = zonedToUtc(occ.date, occ.event.startTime ?? ALL_DAY_TIME, tz);
  return new Date(start.getTime() - minutesBefore * 60_000);
}

/** Every reminder (explicit or calendar-default) whose fire time is within the grace window up to `now`. */
export async function findDueReminders(db: Db, now = new Date(), tz = APP_TZ): Promise<DueReminder[]> {
  const today = todayIn(tz, now);
  const occs = await getOccurrences(db, addDays(today, -1), addDays(today, 31));
  if (!occs.length) return [];

  const eventIds = [...new Set(occs.map((o) => o.event.id))];
  const explicit = await db.select().from(reminders).where(inArray(reminders.eventId, eventIds)).all();
  const byEvent = new Map<number, typeof explicit>();
  for (const r of explicit) byEvent.set(r.eventId, [...(byEvent.get(r.eventId) ?? []), r]);

  const candidates: DueReminder[] = [];
  for (const occ of occs) {
    for (const r of byEvent.get(occ.event.id) ?? []) {
      candidates.push({
        key: `r:${r.id}:${occ.date}`,
        channel: r.channel,
        minutesBefore: r.minutesBefore,
        fireAt: fireTime(occ, r.minutesBefore, tz),
        occurrence: occ,
      });
    }
    const { defaultReminderMinutes: mins, defaultReminderChannel: ch } = occ.calendar;
    if (mins != null && ch) {
      candidates.push({
        key: `c:${occ.calendar.id}:${occ.event.id}:${occ.date}:${mins}:${ch}`,
        channel: ch,
        minutesBefore: mins,
        fireAt: fireTime(occ, mins, tz),
        occurrence: occ,
      });
    }
  }

  const due = candidates.filter((c) => c.fireAt <= now && now.getTime() - c.fireAt.getTime() <= GRACE_MS);
  if (!due.length) return [];
  const existing = await db
    .select()
    .from(deliveries)
    .where(inArray(deliveries.key, due.map((d) => d.key)))
    .all();
  const done = new Set(existing.filter((d) => d.status !== "failed" || d.attempts >= MAX_ATTEMPTS).map((d) => d.key));
  return due.filter((d) => !done.has(d.key));
}

export function buildMessage(d: DueReminder): Message {
  const { event, calendar, date } = d.occurrence;
  const when = `${formatLong(date)}${event.startTime ? ` at ${event.startTime}` : " (all day)"}`;
  const lead = d.minutesBefore === 0 ? "Today" : describeOffset(d.minutesBefore).replace(" before", " to go");
  return {
    title: `⏰ ${event.title} — ${lead}`,
    body: [`${event.title}`, when, `Calendar: ${calendar.name}`, event.description ?? ""].filter(Boolean).join("\n"),
  };
}

/**
 * Send everything that is due. Each key is claimed in the DB first (insert, or flip a failed row back
 * to pending), so a reminder is never sent twice even if two workers overlap.
 */
export async function dispatchDueReminders(db: Db, now = new Date(), sender = send) {
  const results: { key: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const d of await findDueReminders(db, now)) {
    const msg = buildMessage(d);
    let claimed = (
      await db
      .insert(deliveries)
      .values({ key: d.key, title: msg.title, channel: d.channel, status: "pending" })
      .onConflictDoNothing()
      .run()
    ).rowsAffected;
    if (claimed === 0) {
      claimed = (
        await db
        .update(deliveries)
        .set({ status: "pending", attempts: sql`${deliveries.attempts} + 1` })
        .where(and(eq(deliveries.key, d.key), eq(deliveries.status, "failed"), lt(deliveries.attempts, MAX_ATTEMPTS)))
        .run()
      ).rowsAffected;
    }
    if (claimed === 0) continue;
    try {
      await sender(d.channel, msg);
      await db.update(deliveries).set({ status: "sent" }).where(eq(deliveries.key, d.key)).run();
      results.push({ key: d.key, status: "sent" });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await db.update(deliveries).set({ status: "failed", error }).where(eq(deliveries.key, d.key)).run();
      results.push({ key: d.key, status: "failed", error });
    }
  }
  return results;
}

/** Count of events that will notify (for the UI). */
export async function countReminderSources(db: Db) {
  const explicit = (await db.select({ id: reminders.id }).from(reminders).innerJoin(events, eq(events.id, reminders.eventId)).all()).length;
  const calendarDefaults = (
    await db.select({ id: calendars.id }).from(calendars).where(isNotNull(calendars.defaultReminderMinutes)).all()
  ).length;
  return { explicit, calendarDefaults };
}
