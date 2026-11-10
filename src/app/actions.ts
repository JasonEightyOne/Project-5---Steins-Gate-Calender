"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { CHANNELS, calendars, events, reminders, type Channel } from "@/db/schema";
import { send } from "@/lib/notify";
import { importIcsText, syncCalendarFromUrl } from "@/lib/sync";
import {
  calendarDefaultsSchema,
  colorField,
  eventSchema,
  firstError,
  formToObject,
  reminderSchema,
  subscribeSchema,
} from "@/lib/validation";

const MAX_ICS_BYTES = 5 * 1024 * 1024;

function back(path: string, kind: "msg" | "error", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text)}`);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function assertLocalCalendar(calendarId: number) {
  const cal = getDb().select().from(calendars).where(eq(calendars.id, calendarId)).get();
  if (!cal || cal.kind !== "local") throw new Error("Events can only be added to your own (non-imported) calendars");
  return cal;
}

// ---------- events ----------

export async function createEvent(formData: FormData) {
  const parsed = eventSchema.safeParse(formToObject(formData));
  const date = String(formData.get("startDate") ?? "");
  if (!parsed.success) back(`/events/new?date=${date}`, "error", firstError(parsed.error));
  const v = parsed.data;
  try {
    assertLocalCalendar(v.calendarId);
  } catch (err) {
    back(`/events/new?date=${date}`, "error", errorMessage(err));
  }
  const db = getDb();
  const ev = db
    .insert(events)
    .values({
      calendarId: v.calendarId,
      title: v.title,
      description: v.description ?? null,
      startDate: v.startDate,
      endDate: v.endDate,
      startTime: v.startTime ?? null,
      recurrence: v.recurrence,
    })
    .returning()
    .get();
  if (v.reminderMinutes != null && v.reminderChannel) {
    db.insert(reminders).values({ eventId: ev.id, minutesBefore: v.reminderMinutes, channel: v.reminderChannel }).run();
  }
  revalidatePath("/");
  redirect(`/?m=${v.startDate.slice(0, 7)}&msg=${encodeURIComponent(`Saved "${v.title}"`)}`);
}

export async function updateEvent(eventId: number, formData: FormData) {
  const parsed = eventSchema.safeParse(formToObject(formData));
  if (!parsed.success) back(`/events/${eventId}`, "error", firstError(parsed.error));
  const v = parsed.data;
  const db = getDb();
  const existing = db.select().from(events).where(eq(events.id, eventId)).get();
  if (!existing) back("/", "error", "Event not found");
  try {
    assertLocalCalendar(existing.calendarId);
    assertLocalCalendar(v.calendarId);
  } catch (err) {
    back(`/events/${eventId}`, "error", errorMessage(err));
  }
  db.update(events)
    .set({
      calendarId: v.calendarId,
      title: v.title,
      description: v.description ?? null,
      startDate: v.startDate,
      endDate: v.endDate,
      startTime: v.startTime ?? null,
      recurrence: v.recurrence,
    })
    .where(eq(events.id, eventId))
    .run();
  revalidatePath("/");
  back(`/events/${eventId}`, "msg", "Changes saved");
}

export async function deleteEvent(eventId: number) {
  const db = getDb();
  const ev = db.select().from(events).where(eq(events.id, eventId)).get();
  if (ev) {
    assertLocalCalendar(ev.calendarId);
    db.delete(events).where(eq(events.id, eventId)).run();
  }
  revalidatePath("/");
  redirect(`/?m=${ev?.startDate.slice(0, 7) ?? ""}&msg=${encodeURIComponent("Day deleted")}`);
}

// ---------- reminders ----------

export async function addReminder(eventId: number, formData: FormData) {
  const parsed = reminderSchema.safeParse(formToObject(formData));
  if (!parsed.success) back(`/events/${eventId}`, "error", firstError(parsed.error));
  getDb()
    .insert(reminders)
    .values({ eventId, ...parsed.data })
    .onConflictDoNothing()
    .run();
  back(`/events/${eventId}`, "msg", "Reminder added");
}

export async function deleteReminder(reminderId: number, eventId: number) {
  getDb()
    .delete(reminders)
    .where(and(eq(reminders.id, reminderId), eq(reminders.eventId, eventId)))
    .run();
  back(`/events/${eventId}`, "msg", "Reminder removed");
}

// ---------- calendars ----------

export async function createLocalCalendar(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const color = colorField.safeParse(formData.get("color") || undefined);
  if (!name || !color.success) back("/calendars", "error", "Give the calendar a name.");
  getDb().insert(calendars).values({ name, color: color.data, kind: "local" }).run();
  revalidatePath("/");
  back("/calendars", "msg", `Created "${name}"`);
}

export async function subscribeCalendar(formData: FormData) {
  const parsed = subscribeSchema.safeParse(formToObject(formData));
  if (!parsed.success) back("/calendars", "error", firstError(parsed.error));
  const v = parsed.data;
  const db = getDb();
  const cal = db
    .insert(calendars)
    .values({ name: v.name, color: v.color, kind: "ics_url", sourceUrl: v.url, isHoliday: v.isHoliday })
    .returning()
    .get();
  let summary = "";
  try {
    const r = await syncCalendarFromUrl(db, cal.id);
    summary = `Subscribed. Added ${r.total} events.`;
  } catch (err) {
    back("/calendars", "error", `The calendar was saved, but downloading it failed: ${errorMessage(err)}. Check the link, then select Sync now.`);
  }
  revalidatePath("/");
  back("/calendars", "msg", summary);
}

export async function uploadIcs(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) back("/calendars", "error", "Choose an .ics file to import.");
  if (file.size > MAX_ICS_BYTES) back("/calendars", "error", "That file is over 5 MB. Choose a smaller .ics file.");

  const db = getDb();
  const target = Number(formData.get("targetId") || 0);
  let calendarId = target;
  if (!target) {
    const name = String(formData.get("name") ?? "").trim() || file.name.replace(/\.ics$/i, "");
    const color = colorField.safeParse(formData.get("color") || undefined);
    calendarId = db
      .insert(calendars)
      .values({ name, color: color.success ? color.data : "#ff8a2a", kind: "ics_file", isHoliday: formData.get("isHoliday") === "on" })
      .returning()
      .get().id;
  } else {
    const cal = db.select().from(calendars).where(eq(calendars.id, target)).get();
    if (!cal || cal.kind !== "ics_file") back("/calendars", "error", "Choose a calendar that was imported from a file.");
  }

  let summary = "";
  try {
    const r = importIcsText(db, calendarId, await file.text());
    summary = `Imported ${r.total} events: ${r.added} new, ${r.updated} updated, ${r.removed} removed.`;
  } catch (err) {
    if (!target) db.delete(calendars).where(eq(calendars.id, calendarId)).run();
    back("/calendars", "error", `Couldn't import that file: ${errorMessage(err)}`);
  }
  revalidatePath("/");
  back("/calendars", "msg", summary);
}

export async function refreshCalendar(calendarId: number) {
  let summary = "";
  try {
    const r = await syncCalendarFromUrl(getDb(), calendarId);
    summary = `Synced: ${r.added} new, ${r.updated} updated, ${r.removed} removed.`;
  } catch (err) {
    back("/calendars", "error", `Sync failed: ${errorMessage(err)}. Check the link and your connection, then try again.`);
  }
  revalidatePath("/");
  back("/calendars", "msg", summary);
}

export async function toggleCalendarVisible(calendarId: number) {
  const db = getDb();
  const cal = db.select().from(calendars).where(eq(calendars.id, calendarId)).get();
  if (cal) db.update(calendars).set({ visible: !cal.visible }).where(eq(calendars.id, calendarId)).run();
  revalidatePath("/");
  redirect("/calendars");
}

export async function setCalendarDefaults(calendarId: number, formData: FormData) {
  const parsed = calendarDefaultsSchema.safeParse(formToObject(formData));
  if (!parsed.success) back("/calendars", "error", firstError(parsed.error));
  const { defaultReminderMinutes, defaultReminderChannel } = parsed.data;
  const on = defaultReminderMinutes != null && defaultReminderChannel != null;
  getDb()
    .update(calendars)
    .set({
      defaultReminderMinutes: on ? defaultReminderMinutes : null,
      defaultReminderChannel: on ? defaultReminderChannel : null,
    })
    .where(eq(calendars.id, calendarId))
    .run();
  back("/calendars", "msg", on ? "Reminder for every event saved" : "Reminder for every event turned off");
}

export async function deleteCalendar(calendarId: number) {
  const db = getDb();
  const cal = db.select().from(calendars).where(eq(calendars.id, calendarId)).get();
  const localCount = db.select().from(calendars).where(eq(calendars.kind, "local")).all().length;
  if (cal?.kind === "local" && localCount <= 1) back("/calendars", "error", "You need at least one personal calendar, so this one can't be deleted.");
  db.delete(calendars).where(eq(calendars.id, calendarId)).run();
  revalidatePath("/");
  back("/calendars", "msg", `Deleted "${cal?.name ?? "calendar"}"`);
}

// ---------- notifications ----------

export async function sendTestNotification(channel: Channel) {
  if (!CHANNELS.includes(channel)) back("/settings", "error", "Unknown channel");
  try {
    await send(channel, { title: "Chronolab test message", body: "Reminders will reach you here." });
  } catch (err) {
    back("/settings", "error", `Test message failed: ${errorMessage(err)}`);
  }
  back("/settings", "msg", "Test message sent");
}
