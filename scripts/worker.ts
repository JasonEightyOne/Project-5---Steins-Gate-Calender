/**
 * Background worker for self-hosting (a PC, home server or VPS): runs the same tick as
 * /api/cron every minute, so reminders go out and subscriptions refresh nightly.
 * On Vercel, use an external scheduler calling /api/cron instead (see README).
 * Run alongside the web app: `pnpm worker` (add --sync-now to refresh calendars immediately).
 */
import cron from "node-cron";
import { getDb } from "@/db";
import { runCronTick } from "@/lib/cron";
import { APP_TZ } from "@/lib/dates";

const log = (...args: unknown[]) => console.log(new Date().toISOString(), ...args);

async function main() {
  const db = await getDb();
  let busy = false;

  async function tick(forceSync = false) {
    if (busy) return;
    busy = true;
    try {
      const { reminders, sync } = await runCronTick(db, { forceSync });
      for (const r of reminders) log(`reminder ${r.key}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
      for (const s of sync ?? []) {
        log(`sync "${s.name}":`, s.error ? `error ${s.error}` : `${s.result!.added} new, ${s.result!.updated} updated, ${s.result!.removed} removed`);
      }
    } catch (err) {
      log("tick failed:", err);
    } finally {
      busy = false;
    }
  }

  cron.schedule("* * * * *", () => void tick(), { timezone: APP_TZ });
  log(`worker started (tz ${APP_TZ}); reminders every minute, calendar sync nightly at 03:00`);
  await tick(process.argv.includes("--sync-now"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
