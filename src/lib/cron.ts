import { timingSafeEqual } from "node:crypto";
import type { Db } from "@/db";
import { APP_TZ, zonedParts } from "./dates";
import { dispatchDueReminders } from "./reminders";
import { syncAllSubscriptions } from "./sync";

/** Hour (app time zone) at which a cron tick also re-downloads subscribed calendars. */
export const SYNC_HOUR = "03";

/** True when the request carries `Authorization: Bearer <secret>` matching `secret`. Rejects when no secret is configured. */
export function isAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(authHeader ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * One tick of the scheduler: send due reminders, and once a day (during SYNC_HOUR, or when forced)
 * refresh subscribed calendars. Safe to call every minute; repeated or missed ticks don't double-send.
 */
export async function runCronTick(db: Db, opts: { now?: Date; forceSync?: boolean } = {}) {
  const now = opts.now ?? new Date();
  const reminders = await dispatchDueReminders(db, now);
  const { time } = zonedParts(now, APP_TZ);
  const minute = Number(time.slice(3));
  const shouldSync = opts.forceSync || (time.startsWith(SYNC_HOUR) && minute < 5);
  const sync = shouldSync ? await syncAllSubscriptions(db) : null;
  return { at: now.toISOString(), reminders, sync };
}
