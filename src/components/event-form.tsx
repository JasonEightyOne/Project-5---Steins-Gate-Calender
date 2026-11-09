import type { Calendar, CalendarEvent } from "@/db/schema";
import { ChannelSelect, OffsetSelect } from "./reminder-fields";

type Props = {
  action: (fd: FormData) => Promise<void>;
  calendars: Calendar[];
  event?: CalendarEvent;
  defaultDate?: string;
  submitLabel: string;
};

export function EventForm({ action, calendars, event, defaultDate, submitLabel }: Props) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="label mb-1 block">Title</span>
        <input name="title" required maxLength={200} className="field" defaultValue={event?.title} placeholder="e.g. Mum's birthday" autoFocus />
      </label>
      <label>
        <span className="label mb-1 block">Date</span>
        <input type="date" name="startDate" required className="field" defaultValue={event?.startDate ?? defaultDate} />
      </label>
      <label>
        <span className="label mb-1 block">Until (optional, multi-day)</span>
        <input type="date" name="endDate" className="field" defaultValue={event && event.endDate !== event.startDate ? event.endDate : ""} />
      </label>
      <label>
        <span className="label mb-1 block">Time (blank = all day)</span>
        <input type="time" name="startTime" className="field" defaultValue={event?.startTime ?? ""} />
      </label>
      <label>
        <span className="label mb-1 block">Repeat</span>
        <select name="recurrence" className="field" defaultValue={event?.recurrence ?? "none"}>
          <option value="none">Does not repeat</option>
          <option value="yearly">Every year</option>
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="label mb-1 block">Calendar</span>
        <select name="calendarId" className="field" defaultValue={event?.calendarId}>
          {calendars.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="label mb-1 block">Notes</span>
        <textarea name="description" rows={3} maxLength={2000} className="field" defaultValue={event?.description ?? ""} />
      </label>
      {!event && (
        <fieldset className="grid gap-3 rounded-md border border-line p-3 sm:col-span-2 sm:grid-cols-2">
          <legend className="label px-1">Reminder</legend>
          <OffsetSelect name="reminderMinutes" allowNone defaultValue={null} />
          <ChannelSelect name="reminderChannel" />
        </fieldset>
      )}
      <div className="sm:col-span-2">
        <button className="btn btn-primary" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
