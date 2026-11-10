import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
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
  SELECT 'My Days', '#244f8f', 'local'
  WHERE NOT EXISTS (SELECT 1 FROM calendars WHERE kind = 'local');
`;

type DbOptions = { url: string; authToken?: string };

/**
 * Open a libSQL database (a local `file:` path, `:memory:`, or a hosted Turso `libsql://` URL)
 * and make sure the tables exist.
 */
export async function createDb({ url, authToken }: DbOptions) {
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });
  }
  const client = createClient({ url, authToken });
  await client.executeMultiple(`PRAGMA foreign_keys = ON;\n${BOOTSTRAP_SQL}`);
  return drizzle(client, { schema });
}

export type Db = Awaited<ReturnType<typeof createDb>>;

/** Where data lives: Turso when TURSO_DATABASE_URL is set (e.g. on Vercel), otherwise a local file. */
export function dbOptionsFromEnv(): DbOptions {
  if (process.env.TURSO_DATABASE_URL) {
    return { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN };
  }
  if (process.env.VERCEL) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Vercel cannot store a local database file; add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel → Settings → Environment Variables.",
    );
  }
  return { url: `file:${process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "calendar.db")}` };
}

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

/** Shared connection, opened once per server process (and reused across hot reloads in dev). */
export function getDb(): Promise<Db> {
  if (!globalForDb.__db) {
    globalForDb.__db = createDb(dbOptionsFromEnv()).catch((err) => {
      globalForDb.__db = undefined; // let the next request retry instead of caching the failure
      throw err;
    });
  }
  return globalForDb.__db;
}
