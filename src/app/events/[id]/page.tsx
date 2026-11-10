import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { calendars, events, reminders } from "@/db/schema";
import { addReminder, deleteEvent, deleteReminder, updateEvent } from "@/app/actions";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { CHANNEL_LABELS, ChannelSelect, OffsetSelect } from "@/components/reminder-fields";
import { MONTH_NAMES, describeOffset, formatLong, parseYmd } from "@/lib/dates";
import { channelStatus } from "@/lib/notify";
import { ALL_DAY_TIME } from "@/lib/reminders";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> };

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function EventPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = getDb();
  const row = db
    .select({ event: events, calendar: calendars })
    .from(events)
    .innerJoin(calendars, eq(events.calendarId, calendars.id))
    .where(eq(events.id, Number(id)))
    .get();
  if (!row) notFound();
  const { event, calendar } = row;
  const list = db.select().from(reminders).where(eq(reminders.eventId, event.id)).orderBy(asc(reminders.minutesBefore)).all();
  const editable = calendar.kind === "local";
  const status = channelStatus();
  const { y, m } = parseYmd(event.startDate);

  const when = [
    event.endDate !== event.startDate ? `${formatLong(event.startDate)} to ${formatLong(event.endDate)}` : formatLong(event.startDate),
    event.startTime ? `at ${event.startTime}` : "all day",
    event.recurrence === "yearly" ? "every year" : null,
  ].filter(Boolean).join(", ");

  return (
    <div className="readable">
      <Link href={`/?m=${event.startDate.slice(0, 7)}`} className="t-small">Back to {MONTH_NAMES[m - 1]} {y}</Link>
      <div className="mt-4"><Flash msg={sp.msg} error={sp.error} /></div>

      <p className="t-small text-pencil">{calendar.isHoliday ? `Public holiday, from ${calendar.name}` : calendar.name}</p>
      <h1 className="t-h1 mt-1" style={{ color: calendar.isHoliday ? "var(--holiday)" : "var(--ink)" }}>{event.title}</h1>
      <p className="mt-2">{capitalize(when)}</p>
      {event.description && <p className="mt-3 whitespace-pre-line text-pencil">{event.description}</p>}
      {!editable && (
        <p className="t-small mt-3 text-pencil">
          This comes from an imported calendar, so its details update when that calendar syncs. You can still set reminders for it.
        </p>
      )}

      <section aria-labelledby="reminders" className="rule mt-8 pt-6">
        <h2 id="reminders" className="t-h3 mb-3">Reminders</h2>
        {calendar.defaultReminderMinutes != null && calendar.defaultReminderChannel && (
          <p className="mb-3 text-[0.9rem]">
            Every event in {calendar.name} reminds you {describeOffset(calendar.defaultReminderMinutes)} {CHANNEL_LABELS[calendar.defaultReminderChannel]}.
          </p>
        )}
        {list.length > 0 ? (
          <ul className="mb-5 space-y-2">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  {capitalize(describeOffset(r.minutesBefore))}, {CHANNEL_LABELS[r.channel]}
                  {!status[r.channel].configured && (
                    <span className="t-small ml-2 text-holiday">Won&apos;t send until this is set up in <Link href="/settings">Alerts</Link></span>
                  )}
                </span>
                <form action={deleteReminder.bind(null, r.id, event.id)}>
                  <button className="btn btn-quiet" type="submit">Remove reminder</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          calendar.defaultReminderMinutes == null && <p className="mb-4 text-pencil">No reminders yet. Add one below.</p>
        )}
        <form action={addReminder.bind(null, event.id)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <OffsetSelect name="minutesBefore" />
          <ChannelSelect name="channel" />
          <button className="btn btn-ink" type="submit">Add reminder</button>
        </form>
        <p className="t-small mt-2 text-pencil">All-day reminders arrive at {ALL_DAY_TIME}.</p>
      </section>

      {editable && (
        <section aria-labelledby="edit" className="rule mt-8 pt-6">
          <h2 id="edit" className="t-h3 mb-4">Edit this day</h2>
          <EventForm
            action={updateEvent.bind(null, event.id)}
            calendars={db.select().from(calendars).where(eq(calendars.kind, "local")).all()}
            event={event}
            submitLabel="Save changes"
          />
          <form action={deleteEvent.bind(null, event.id)} className="mt-8">
            <button className="btn btn-danger" type="submit">Delete this day</button>
          </form>
        </section>
      )}
    </div>
  );
}
