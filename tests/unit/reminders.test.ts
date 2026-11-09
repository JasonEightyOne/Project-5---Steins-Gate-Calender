import { describe, expect, it, vi } from "vitest";
import { createDb } from "@/db";
import { calendars, deliveries, events, reminders } from "@/db/schema";
import { getOccurrences } from "@/lib/occurrences";
import { dispatchDueReminders, findDueReminders } from "@/lib/reminders";

function setup() {
  const db = createDb(":memory:");
  const local = db.select().from(calendars).get()!; // bootstrap creates "My Days"
  return { db, local };
}

describe("occurrences", () => {
  it("repeats yearly events and spreads multi-day events", () => {
    const { db, local } = setup();
    db.insert(events).values([
      { calendarId: local.id, title: "Birthday", startDate: "2020-11-15", endDate: "2020-11-15", recurrence: "yearly" },
      { calendarId: local.id, title: "Trip", startDate: "2026-10-30", endDate: "2026-11-02" },
    ]).run();
    const occ = getOccurrences(db, "2026-11-01", "2026-11-30");
    expect(occ.map((o) => [o.event.title, o.date])).toEqual([["Trip", "2026-10-30"], ["Birthday", "2026-11-15"]]);
  });
});

describe("reminders", () => {
  it("fires an all-day reminder 1 day before at 09:00 Malaysia time, exactly once", async () => {
    const { db, local } = setup();
    const ev = db.insert(events).values({ calendarId: local.id, title: "Deepavali", startDate: "2026-11-08", endDate: "2026-11-08" }).returning().get();
    db.insert(reminders).values({ eventId: ev.id, minutesBefore: 1440, channel: "email" }).run();

    // 7 Nov 08:59 MYT = 00:59Z → not yet due
    expect(findDueReminders(db, new Date("2026-11-07T00:59:00Z"))).toHaveLength(0);
    // 7 Nov 09:00 MYT = 01:00Z → due
    const sender = vi.fn().mockResolvedValue(undefined);
    const res = await dispatchDueReminders(db, new Date("2026-11-07T01:00:00Z"), sender);
    expect(res).toEqual([{ key: `r:1:2026-11-08`, status: "sent" }]);
    expect(sender).toHaveBeenCalledWith("email", expect.objectContaining({ title: expect.stringContaining("Deepavali") }));

    // second run does not resend
    expect(await dispatchDueReminders(db, new Date("2026-11-07T01:05:00Z"), sender)).toEqual([]);
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it("applies calendar-wide default reminders to every event in that calendar", async () => {
    const { db } = setup();
    const hol = db.insert(calendars).values({ name: "MY holidays", kind: "ics_url", isHoliday: true, defaultReminderMinutes: 0, defaultReminderChannel: "ntfy" }).returning().get();
    db.insert(events).values({ calendarId: hol.id, uid: "x", title: "Christmas", startDate: "2026-12-25", endDate: "2026-12-25" }).run();
    const sender = vi.fn().mockRejectedValue(new Error("boom"));
    const res = await dispatchDueReminders(db, new Date("2026-12-25T01:30:00Z"), sender);
    expect(res[0]).toMatchObject({ status: "failed", error: "boom" });
    expect(db.select().from(deliveries).get()).toMatchObject({ status: "failed", channel: "ntfy", attempts: 1 });

    // retried on later ticks, up to 3 attempts in total, then given up
    await dispatchDueReminders(db, new Date("2026-12-25T01:31:00Z"), sender);
    await dispatchDueReminders(db, new Date("2026-12-25T01:32:00Z"), sender);
    await dispatchDueReminders(db, new Date("2026-12-25T01:33:00Z"), sender);
    expect(sender).toHaveBeenCalledTimes(3);
    expect(db.select().from(deliveries).get()).toMatchObject({ status: "failed", attempts: 3 });
  });

  it("succeeds on retry after a transient failure", async () => {
    const { db, local } = setup();
    const ev = db.insert(events).values({ calendarId: local.id, title: "Hari Raya", startDate: "2026-12-01", endDate: "2026-12-01" }).returning().get();
    db.insert(reminders).values({ eventId: ev.id, minutesBefore: 0, channel: "email" }).run();
    const sender = vi.fn().mockRejectedValueOnce(new Error("timeout")).mockResolvedValue(undefined);
    await dispatchDueReminders(db, new Date("2026-12-01T01:00:00Z"), sender);
    expect(await dispatchDueReminders(db, new Date("2026-12-01T01:01:00Z"), sender)).toEqual([{ key: "r:1:2026-12-01", status: "sent" }]);
    expect(db.select().from(deliveries).get()).toMatchObject({ status: "sent", attempts: 2 });
  });

  it("skips reminders missed by more than the grace window", () => {
    const { db, local } = setup();
    const ev = db.insert(events).values({ calendarId: local.id, title: "Old", startDate: "2026-11-08", endDate: "2026-11-08", startTime: "08:00" }).returning().get();
    db.insert(reminders).values({ eventId: ev.id, minutesBefore: 0, channel: "email" }).run();
    expect(findDueReminders(db, new Date("2026-11-08T23:00:00Z"))).toHaveLength(0);
  });
});
