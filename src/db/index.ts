import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS calendars (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ff8a2a',
  kind TEXT NOT NULL,
  source_url TEXT,
  is_holiday INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  default_reminder_minutes INTEGER,
  default_reminder_channel TEXT,
  last_synced_at INTEGER,
  last_sync_error TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  calendar_id INTEGER NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  uid TEXT,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none'
);
CREATE UNIQUE INDEX IF NOT EXISTS events_calendar_uid ON events(calendar_id, uid);
CREATE INDEX IF NOT EXISTS events_dates ON events(start_date, end_date);
CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  minutes_before INTEGER NOT NULL,
  channel TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS reminders_unique ON reminders(event_id, minutes_before, channel);
CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
INSERT INTO calendars (name, color, kind)
  SELECT 'My Days', '#7dffa8', 'local'
  WHERE NOT EXISTS (SELECT 1 FROM calendars WHERE kind = 'local');
`;

export function createDb(file: string) {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(BOOTSTRAP_SQL);
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

const globalForDb = globalThis as unknown as { __db?: Db };

/** Shared connection (reused across hot reloads in dev). */
export function getDb(): Db {
  if (!globalForDb.__db) {
    globalForDb.__db = createDb(process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "calendar.db"));
  }
  return globalForDb.__db;
}
