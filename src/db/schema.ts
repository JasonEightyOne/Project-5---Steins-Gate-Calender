import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const CHANNELS = ["email", "ntfy"] as const;
export type Channel = (typeof CHANNELS)[number];

export const calendars = sqliteTable("calendars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#ff8a2a"),
  kind: text("kind", { enum: ["local", "ics_url", "ics_file"] }).notNull(),
  sourceUrl: text("source_url"),
  isHoliday: integer("is_holiday", { mode: "boolean" }).notNull().default(false),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  /** Optional reminder applied to every event in this calendar (e.g. all public holidays). */
  defaultReminderMinutes: integer("default_reminder_minutes"),
  defaultReminderChannel: text("default_reminder_channel", { enum: CHANNELS }),
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  lastSyncError: text("last_sync_error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    calendarId: integer("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    /** Stable id from the ICS source; null for events created in the app. */
    uid: text("uid"),
    title: text("title").notNull(),
    description: text("description"),
    /** YYYY-MM-DD, in the app time zone. */
    startDate: text("start_date").notNull(),
    /** YYYY-MM-DD, inclusive. */
    endDate: text("end_date").notNull(),
    /** HH:MM, null for all-day events. */
    startTime: text("start_time"),
    recurrence: text("recurrence", { enum: ["none", "yearly"] }).notNull().default("none"),
  },
  (t) => [uniqueIndex("events_calendar_uid").on(t.calendarId, t.uid)],
);

export const reminders = sqliteTable(
  "reminders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    minutesBefore: integer("minutes_before").notNull(),
    channel: text("channel", { enum: CHANNELS }).notNull(),
  },
  (t) => [uniqueIndex("reminders_unique").on(t.eventId, t.minutesBefore, t.channel)],
);

/** One row per notification attempt; `key` makes sending idempotent. */
export const deliveries = sqliteTable("deliveries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  channel: text("channel", { enum: CHANNELS }).notNull(),
  status: text("status", { enum: ["pending", "sent", "failed"] }).notNull(),
  error: text("error"),
  attempts: integer("attempts").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Calendar = typeof calendars.$inferSelect;
export type CalendarEvent = typeof events.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
