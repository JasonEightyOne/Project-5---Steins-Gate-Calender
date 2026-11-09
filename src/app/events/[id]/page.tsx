import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { calendars, events, reminders } from "@/db/schema";
import { addReminder, deleteEvent, deleteReminder, updateEvent } from "@/app/actions";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { CHANNEL_LABELS, ChannelSelect, OffsetSelect } from "@/components/reminder-fields";
import { describeOffset, formatLong } from "@/lib/dates";
import { channelStatus } from "@/lib/notify";
import { ALL_DAY_TIME } from "@/lib/reminders";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; error?: string }> };

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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/?m=${event.startDate.slice(0, 7)}`} className="text-sm text-muted hover:text-phosphor">← back to calendar</Link>
      <Flash msg={sp.msg} error={sp.error} />

      <section className="panel p-5">
        <div className="label mb-1" style={{ color: calendar.color }}>{calendar.name}{calendar.isHoliday ? " · holiday" : ""}</div>
        <h1 className="amber text-2xl">{event.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatLong(event.startDate)}
          {event.endDate !== event.startDate && ` → ${formatLong(event.endDate)}`}
          {event.startTime ? ` · ${event.startTime}` : " · all day"}
          {event.recurrence === "yearly" && " · repeats yearly"}
        </p>
        {event.description && <p className="mt-3 whitespace-pre-line text-sm">{event.description}</p>}
        {!editable && (
          <p className="mt-3 text-xs text-muted">
            Imported from {calendar.kind === "ics_url" ? "a subscription" : "an .ics file"}; details update on re-sync. You can still add reminders.
          </p>
        )}
      </section>

      <section className="panel p-5">
        <h2 className="label mb-3">Reminders</h2>
        {calendar.defaultReminderMinutes != null && calendar.defaultReminderChannel && (
          <p className="mb-3 text-sm text-muted">
            Calendar-wide: {describeOffset(calendar.defaultReminderMinutes)} via {CHANNEL_LABELS[calendar.defaultReminderChannel]}
          </p>
        )}
        {list.length > 0 ? (
          <ul className="mb-4 space-y-2">
            {list.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="crt">
                  ⏰ {describeOffset(r.minutesBefore)} · {CHANNEL_LABELS[r.channel]}
                  {!status[r.channel].configured && <span className="ml-2 text-danger">(channel not configured)</span>}
                </span>
                <form action={deleteReminder.bind(null, r.id, event.id)}>
                  <button className="btn btn-danger" type="submit">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">No reminders on this event.</p>
        )}
        <form action={addReminder.bind(null, event.id)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <OffsetSelect name="minutesBefore" />
          <ChannelSelect name="channel" />
          <button className="btn btn-primary" type="submit">Add</button>
        </form>
        <p className="mt-2 text-xs text-muted">All-day events notify at {ALL_DAY_TIME} Malaysia time on the chosen day.</p>
      </section>

      {editable && (
        <section className="panel p-5">
          <h2 className="label mb-3">Edit</h2>
          <EventForm
            action={updateEvent.bind(null, event.id)}
            calendars={db.select().from(calendars).where(eq(calendars.kind, "local")).all()}
            event={event}
            submitLabel="Save changes"
          />
          <form action={deleteEvent.bind(null, event.id)} className="mt-4 border-t border-line pt-4">
            <button className="btn btn-danger" type="submit">Delete event</button>
          </form>
        </section>
      )}
    </div>
  );
}
