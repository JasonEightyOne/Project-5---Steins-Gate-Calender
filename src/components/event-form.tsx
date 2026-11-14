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
    <form action={action} className="readable grid gap-5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="field-label">What is it?</span>
        <input name="title" required maxLength={200} className="field" defaultValue={event?.title} placeholder="Mum's birthday" autoFocus={!event} />
      </label>
      <label>
        <span className="field-label">Date</span>
        <input type="date" name="startDate" required className="field" defaultValue={event?.startDate ?? defaultDate} />
      </label>
      <label>
        <span className="field-label">Last day, if it runs over several days</span>
        <input type="date" name="endDate" className="field" defaultValue={event && event.endDate !== event.startDate ? event.endDate : ""} />
      </label>
      <label>
        <span className="field-label">Time, or leave empty for all day</span>
        <input type="time" name="startTime" className="field" defaultValue={event?.startTime ?? ""} />
      </label>
      <label>
        <span className="field-label">Repeat</span>
        <select name="recurrence" className="field" defaultValue={event?.recurrence ?? "none"}>
          <option value="none">Just this once</option>
          <option value="yearly">Every year</option>
        </select>
      </label>
      {calendars.length > 1 && (
        <label className="sm:col-span-2">
          <span className="field-label">Calendar</span>
          <select name="calendarId" className="field" defaultValue={event?.calendarId}>
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {calendars.length === 1 && <input type="hidden" name="calendarId" value={calendars[0].id} />}
      <label className="sm:col-span-2">
        <span className="field-label">Notes</span>
        <textarea name="description" rows={3} maxLength={2000} className="field" defaultValue={event?.description ?? ""} />
      </label>
      {!event && (
        <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <legend className="field-label">Remind me</legend>
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
