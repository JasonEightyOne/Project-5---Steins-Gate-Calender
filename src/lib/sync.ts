import { and, eq, inArray, isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { calendars, events, reminders } from "@/db/schema";
import { fetchIcs, parseIcs, type ImportedEvent } from "./ics";

export type SyncResult = { added: number; updated: number; removed: number; total: number };

/**
 * Replace a calendar's imported events with `incoming`, matching on UID.
 * Existing rows keep their id, so reminders attached to them survive a re-import.
 */
export async function upsertImportedEvents(db: Db, calendarId: number, incoming: ImportedEvent[]): Promise<SyncResult> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: events.id, uid: events.uid })
      .from(events)
      .where(and(eq(events.calendarId, calendarId), isNotNull(events.uid)))
      .all();
    const byUid = new Map(existing.map((e) => [e.uid!, e.id]));
    const seen = new Set<string>();
    let added = 0;
    let updated = 0;

    for (const ev of incoming) {
      if (seen.has(ev.uid)) continue;
      seen.add(ev.uid);
      const values = {
        title: ev.title,
        description: ev.description,
        startDate: ev.startDate,
        endDate: ev.endDate,
        startTime: ev.startTime,
      };
      const id = byUid.get(ev.uid);
      if (id) {
        await tx.update(events).set(values).where(eq(events.id, id)).run();
        updated++;
      } else {
        await tx.insert(events).values({ ...values, calendarId, uid: ev.uid, recurrence: "none" }).run();
        added++;
      }
    }

    const stale = existing.filter((e) => !seen.has(e.uid!)).map((e) => e.id);
    if (stale.length) {
      // Explicit child cleanup: hosted libSQL may not enforce ON DELETE CASCADE.
      await tx.delete(reminders).where(inArray(reminders.eventId, stale)).run();
      await tx.delete(events).where(inArray(events.id, stale)).run();
    }
    return { added, updated, removed: stale.length, total: seen.size };
  });
}

export async function importIcsText(db: Db, calendarId: number, icsText: string): Promise<SyncResult> {
  const result = await upsertImportedEvents(db, calendarId, parseIcs(icsText));
  await db
    .update(calendars)
    .set({ lastSyncedAt: new Date(), lastSyncError: null })
    .where(eq(calendars.id, calendarId))
    .run();
  return result;
}

/** Download and re-import a URL-subscribed calendar. Errors are stored on the calendar and re-thrown. */
export async function syncCalendarFromUrl(db: Db, calendarId: number): Promise<SyncResult> {
  const cal = await db.select().from(calendars).where(eq(calendars.id, calendarId)).get();
  if (!cal?.sourceUrl) throw new Error("Calendar has no source URL");
  try {
    return await importIcsText(db, calendarId, await fetchIcs(cal.sourceUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(calendars).set({ lastSyncError: message }).where(eq(calendars.id, calendarId)).run();
    throw err;
  }
}

export async function syncAllSubscriptions(db: Db): Promise<{ id: number; name: string; result?: SyncResult; error?: string }[]> {
  const subs = await db.select().from(calendars).where(eq(calendars.kind, "ics_url")).all();
  const out = [];
  for (const cal of subs) {
    try {
      out.push({ id: cal.id, name: cal.name, result: await syncCalendarFromUrl(db, cal.id) });
    } catch (err) {
      out.push({ id: cal.id, name: cal.name, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return out;
}
