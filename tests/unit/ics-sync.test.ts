import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/db";
import { calendars, events, reminders } from "@/db/schema";
import { parseIcs } from "@/lib/ics";
import { importIcsText } from "@/lib/sync";

const fixture = fs.readFileSync(path.join(__dirname, "../fixtures/malaysia-sample.ics"), "utf8");
const window = { from: new Date("2026-01-01"), to: new Date("2028-12-31") };

describe("parseIcs", () => {
  const parsed = parseIcs(fixture, window);

  it("keeps all-day dates exact and end dates inclusive", async () => {
    const cny = parsed.find((e) => e.title === "Chinese New Year")!;
    expect(cny).toMatchObject({ startDate: "2027-02-06", endDate: "2027-02-07", startTime: null });
    expect(parsed.find((e) => e.title === "New Year's Day")).toMatchObject({ startDate: "2027-01-01", endDate: "2027-01-01" });
  });

  it("expands yearly RRULEs into occurrences", async () => {
    expect(parsed.filter((e) => e.title === "Merdeka Day").map((e) => e.startDate)).toEqual([
      "2026-08-31", "2027-08-31", "2028-08-31",
    ]);
  });

  it("converts timed events into Malaysia time", async () => {
    expect(parsed.find((e) => e.uid === "timed@sample")).toMatchObject({ startDate: "2026-11-20", startTime: "20:00" });
    expect(parsed.find((e) => e.uid === "utc@sample")).toMatchObject({ startDate: "2027-01-01", startTime: "00:00" });
  });

  it("rejects non-ICS input", async () => {
    expect(() => parseIcs("hello")).toThrow(/iCalendar/);
  });
});

describe("importIcsText", () => {
  it("is idempotent, keeps reminders, and removes events dropped from the source", async () => {
    const db = await createDb({ url: ":memory:" });
    const cal = await db.insert(calendars).values({ name: "MY", kind: "ics_file", isHoliday: true }).returning().get();

    const first = await importIcsText(db, cal.id, fixture);
    expect(first.added).toBeGreaterThan(0);
    const cny = (await db.select().from(events).where(eq(events.uid, "20270206_cny@sample")).get())!;
    await db.insert(reminders).values({ eventId: cny.id, minutesBefore: 1440, channel: "email" }).run();

    const second = await importIcsText(db, cal.id, fixture);
    expect(second).toMatchObject({ added: 0, removed: 0 });
    expect(await db.select().from(reminders).all()).toHaveLength(1);

    const trimmed = fixture.replace(/BEGIN:VEVENT\r?\nDTSTART;VALUE=DATE:20270101[\s\S]*?END:VEVENT\r?\n/, "");
    const third = await importIcsText(db, cal.id, trimmed);
    expect(third.removed).toBe(1);
    expect((await db.select().from(events).where(eq(events.uid, "20270206_cny@sample")).get())?.id).toBe(cny.id);
  });
});
