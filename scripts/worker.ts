/**
 * Background worker: sends due reminders every minute and refreshes subscribed calendars daily.
 * Run alongside the web app: `pnpm worker`.
 */
import cron from "node-cron";
import { getDb } from "@/db";
import { APP_TZ } from "@/lib/dates";
import { dispatchDueReminders } from "@/lib/reminders";
import { syncAllSubscriptions } from "@/lib/sync";

const db = getDb();
const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    for (const r of await dispatchDueReminders(db)) log(`reminder ${r.key}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
  } catch (err) {
    log("reminder tick failed:", err);
  } finally {
    busy = false;
  }
}

async function syncAll() {
  for (const r of await syncAllSubscriptions(db)) {
    log(`sync "${r.name}":`, r.error ? `error ${r.error}` : `${r.result!.added} new, ${r.result!.updated} updated, ${r.result!.removed} removed`);
  }
}

cron.schedule("* * * * *", tick, { timezone: APP_TZ });
cron.schedule("15 3 * * *", syncAll, { timezone: APP_TZ });

log(`worker started (tz ${APP_TZ}); reminders every minute, calendar sync daily 03:15`);
void tick();
if (process.argv.includes("--sync-now")) void syncAll();
