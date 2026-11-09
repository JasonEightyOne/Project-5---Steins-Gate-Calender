import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { calendars, events } from "@/db/schema";
import {
  createLocalCalendar,
  deleteCalendar,
  refreshCalendar,
  setCalendarDefaults,
  subscribeCalendar,
  toggleCalendarVisible,
  uploadIcs,
} from "@/app/actions";
import { Flash } from "@/components/flash";
import { ChannelSelect, OffsetSelect } from "@/components/reminder-fields";
import { HOLIDAY_PRESETS } from "@/lib/presets";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";

const KIND_LABEL = { local: "personal", ics_url: "subscription", ics_file: "imported file" } as const;

export default async function CalendarsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const db = getDb();
  const cals = db.select().from(calendars).orderBy(asc(calendars.id)).all();
  const counts = new Map(
    db.select({ id: events.calendarId, n: count() }).from(events).groupBy(events.calendarId).all().map((r) => [r.id, r.n]),
  );
  const subscribed = new Set(cals.map((c) => c.sourceUrl));
  const fileCals = cals.filter((c) => c.kind === "ics_file");

  return (
    <div className="space-y-6">
      <h1 className="amber text-2xl">Calendars</h1>
      <Flash msg={sp.msg} error={sp.error} />

      <section className="panel divide-y divide-line">
        {cals.map((c) => (
          <div key={c.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block size-3 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
                <span className={c.visible ? "" : "text-muted line-through"}>{c.name}</span>
                <span className="label">{KIND_LABEL[c.kind]}{c.isHoliday ? " · holiday" : ""}</span>
              </div>
              <div className="mt-1 text-xs text-muted">
                {counts.get(c.id) ?? 0} events
                {c.lastSyncedAt && ` · synced ${c.lastSyncedAt.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}`}
              </div>
              {c.sourceUrl && <div className="mt-1 max-w-xl truncate text-xs text-muted" title={c.sourceUrl}>{c.sourceUrl}</div>}
              {c.lastSyncError && <div className="mt-1 text-xs text-danger">Last sync error: {c.lastSyncError}</div>}

              <form action={setCalendarDefaults.bind(null, c.id)} className="mt-3 flex flex-wrap items-center gap-2">
                <span className="label">Remind for every event:</span>
                <div className="w-44"><OffsetSelect name="defaultReminderMinutes" allowNone defaultValue={c.defaultReminderMinutes} /></div>
                <div className="w-44"><ChannelSelect name="defaultReminderChannel" defaultValue={c.defaultReminderChannel} /></div>
                <button className="btn" type="submit">Save</button>
              </form>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.kind === "ics_url" && (
                <form action={refreshCalendar.bind(null, c.id)}><button className="btn" type="submit">↻ Sync now</button></form>
              )}
              <form action={toggleCalendarVisible.bind(null, c.id)}>
                <button className="btn" type="submit">{c.visible ? "Hide" : "Show"}</button>
              </form>
              <form action={deleteCalendar.bind(null, c.id)}><button className="btn btn-danger" type="submit">Delete</button></form>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-5">
          <h2 className="label mb-3">Quick subscribe</h2>
          {HOLIDAY_PRESETS.map((p) => (
            <form key={p.id} action={subscribeCalendar} className="space-y-2">
              <input type="hidden" name="name" value={p.name} />
              <input type="hidden" name="url" value={p.url} />
              <input type="hidden" name="color" value={p.color} />
              <input type="hidden" name="isHoliday" value="on" />
              <div className="amber">🇲🇾 {p.name}</div>
              <p className="text-xs text-muted">{p.note}</p>
              <button className="btn btn-primary" type="submit" disabled={subscribed.has(p.url)}>
                {subscribed.has(p.url) ? "Already subscribed" : "Subscribe"}
              </button>
            </form>
          ))}

          <h2 className="label mb-3 mt-6">Subscribe to any .ics URL</h2>
          <form action={subscribeCalendar} className="space-y-3">
            <input name="name" required placeholder="Name" className="field" />
            <input name="url" required placeholder="https://… or webcal://…" className="field" />
            <div className="flex items-center gap-3">
              <input type="color" name="color" defaultValue="#5ec8ff" className="h-9 w-12 rounded bg-transparent" aria-label="Color" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isHoliday" /> Holiday calendar</label>
            </div>
            <button className="btn" type="submit">Subscribe</button>
          </form>
        </section>

        <section className="panel p-5">
          <h2 className="label mb-3">Import an .ics file</h2>
          <form action={uploadIcs} className="space-y-3">
            <input type="file" name="file" accept=".ics,text/calendar" required className="field" />
            <select name="targetId" className="field" defaultValue="">
              <option value="">→ Create a new calendar</option>
              {fileCals.map((c) => <option key={c.id} value={c.id}>↻ Update “{c.name}”</option>)}
            </select>
            <input name="name" placeholder="Name for new calendar (optional)" className="field" />
            <div className="flex items-center gap-3">
              <input type="color" name="color" defaultValue="#ff9a3c" className="h-9 w-12 rounded bg-transparent" aria-label="Color" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isHoliday" defaultChecked /> Holiday calendar</label>
            </div>
            <button className="btn btn-primary" type="submit">Import</button>
            <p className="text-xs text-muted">Re-importing updates matching events (by UID) and keeps their reminders.</p>
          </form>

          <h2 className="label mb-3 mt-6">New personal calendar</h2>
          <form action={createLocalCalendar} className="flex gap-2">
            <input name="name" required placeholder="e.g. Family" className="field" />
            <input type="color" name="color" defaultValue="#7dffa8" className="h-9 w-12 shrink-0 rounded bg-transparent" aria-label="Color" />
            <button className="btn" type="submit">Create</button>
          </form>
        </section>
      </div>
    </div>
  );
}
