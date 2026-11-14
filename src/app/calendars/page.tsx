import { asc, count } from "drizzle-orm";
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

export const dynamic = "force-dynamic";

const KIND = { local: "Your own days", ics_url: "Subscribed by link", ics_file: "Imported from a file" } as const;

export default async function CalendarsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const cals = await db.select().from(calendars).orderBy(asc(calendars.id)).all();
  const counts = new Map(
    (await db.select({ id: events.calendarId, n: count() }).from(events).groupBy(events.calendarId).all()).map((r) => [r.id, r.n]),
  );
  const subscribed = new Set(cals.map((c) => c.sourceUrl));
  const fileCals = cals.filter((c) => c.kind === "ics_file");
  const fmt = (d: Date) => d.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="readable">
      <h1 className="t-h1 mb-2">Calendars</h1>
      <p className="mb-8 text-muted">Your own days, plus public holidays and other calendars you bring in.</p>
      <Flash msg={sp.msg} error={sp.error} />

      <ul>
        {cals.map((c) => (
          <li key={c.id} className="rule py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="t-h3" style={{ color: c.isHoliday ? "var(--off)" : "var(--ink)" }}>
                  {c.name}
                  {!c.visible && <span className="t-small ml-2 font-normal text-muted">(hidden)</span>}
                </h2>
                <p className="t-small text-muted">
                  {KIND[c.kind]}, {counts.get(c.id) ?? 0} events.
                  {c.lastSyncedAt && ` Last updated ${fmt(c.lastSyncedAt)}.`}
                </p>
                {c.sourceUrl && <p className="t-small truncate text-muted" title={c.sourceUrl}>{c.sourceUrl}</p>}
                {c.lastSyncError && <p className="t-small mt-1 text-off">Last update failed: {c.lastSyncError}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {c.kind === "ics_url" && (
                  <form action={refreshCalendar.bind(null, c.id)}><button className="btn" type="submit">Sync now</button></form>
                )}
                <form action={toggleCalendarVisible.bind(null, c.id)}>
                  <button className="btn btn-quiet" type="submit">{c.visible ? "Hide" : "Show"}</button>
                </form>
                <form action={deleteCalendar.bind(null, c.id)}><button className="btn btn-quiet" type="submit">Delete</button></form>
              </div>
            </div>

            <form action={setCalendarDefaults.bind(null, c.id)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label>
                <span className="field-label">Remind me about every event here</span>
                <OffsetSelect name="defaultReminderMinutes" allowNone defaultValue={c.defaultReminderMinutes} />
              </label>
              <label>
                <span className="field-label sr-only sm:not-sr-only sm:invisible">How</span>
                <ChannelSelect name="defaultReminderChannel" defaultValue={c.defaultReminderChannel} />
              </label>
              <button className="btn" type="submit">Save</button>
            </form>
          </li>
        ))}
      </ul>

      <section aria-labelledby="add" className="rule mt-4 pt-8">
        <h2 id="add" className="t-h2 mb-6">Add a calendar</h2>

        {HOLIDAY_PRESETS.map((p) => (
          <form key={p.id} action={subscribeCalendar} className="mb-10">
            <input type="hidden" name="name" value={p.name} />
            <input type="hidden" name="url" value={p.url} />
            <input type="hidden" name="color" value={p.color} />
            <input type="hidden" name="isHoliday" value="on" />
            <h3 className="t-h3 text-off">{p.name}</h3>
            <p className="mb-3 text-[0.9rem] text-muted">{p.note}</p>
            <button className="btn btn-primary" type="submit" disabled={subscribed.has(p.url)}>
              {subscribed.has(p.url) ? "Already added" : "Add Malaysia public holidays"}
            </button>
          </form>
        ))}

        <form action={subscribeCalendar} className="mb-10 grid gap-3">
          <h3 className="t-h3">Subscribe by link</h3>
          <p className="-mt-2 text-[0.9rem] text-muted">Paste a calendar link ending in .ics, or a webcal:// link. It updates every night.</p>
          <label><span className="field-label">Name</span><input name="name" required className="field" placeholder="Selangor school terms" /></label>
          <label><span className="field-label">Link</span><input name="url" required className="field" placeholder="https://example.com/calendar.ics" /></label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2"><input type="color" name="color" defaultValue="#244f8f" className="h-9 w-11" /> <span className="text-[0.9rem]">Colour</span></label>
            <label className="flex items-center gap-2 text-[0.9rem]"><input type="checkbox" name="isHoliday" /> Show as holidays (red)</label>
          </div>
          <div><button className="btn" type="submit">Subscribe</button></div>
        </form>

        <form action={uploadIcs} className="mb-10 grid gap-3">
          <h3 className="t-h3">Import a file</h3>
          <p className="-mt-2 text-[0.9rem] text-muted">Importing the same file again updates its events and keeps your reminders.</p>
          <label><span className="field-label">.ics file</span><input type="file" name="file" accept=".ics,text/calendar" required className="field" /></label>
          <label>
            <span className="field-label">Import into</span>
            <select name="targetId" className="field" defaultValue="">
              <option value="">A new calendar</option>
              {fileCals.map((c) => <option key={c.id} value={c.id}>{c.name} (update it)</option>)}
            </select>
          </label>
          <label><span className="field-label">Name for a new calendar (optional)</span><input name="name" className="field" /></label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2"><input type="color" name="color" defaultValue="#b3242e" className="h-9 w-11" /> <span className="text-[0.9rem]">Colour</span></label>
            <label className="flex items-center gap-2 text-[0.9rem]"><input type="checkbox" name="isHoliday" defaultChecked /> Show as holidays (red)</label>
          </div>
          <div><button className="btn" type="submit">Import file</button></div>
        </form>

        <form action={createLocalCalendar} className="grid gap-3">
          <h3 className="t-h3">New calendar for your own days</h3>
          <div className="flex gap-2">
            <label className="flex-1"><span className="sr-only">Name</span><input name="name" required placeholder="Family" className="field" /></label>
            <label><span className="sr-only">Colour</span><input type="color" name="color" defaultValue="#244f8f" className="h-10 w-11" /></label>
            <button className="btn" type="submit">Create</button>
          </div>
        </form>
      </section>
    </div>
  );
}
