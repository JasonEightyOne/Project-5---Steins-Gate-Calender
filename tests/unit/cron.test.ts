import { afterEach, describe, expect, it, vi } from "vitest";
import { createDb, dbOptionsFromEnv } from "@/db";
import { calendars, events, reminders } from "@/db/schema";
import { isAuthorized, runCronTick } from "@/lib/cron";

afterEach(() => vi.unstubAllEnvs());

describe("cron auth", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorized("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorized("Bearer wrong!", "s3cret")).toBe(false);
    expect(isAuthorized(null, "s3cret")).toBe(false);
    expect(isAuthorized("Bearer ", undefined)).toBe(false); // no secret configured → always reject
  });
});

describe("runCronTick", () => {
  it("sends due reminders once and only syncs during the nightly window", async () => {
    vi.stubEnv("NTFY_URL", "https://ntfy.example/topic");
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);

    const db = await createDb({ url: ":memory:" });
    const local = (await db.select().from(calendars).get())!;
    const ev = await db.insert(events).values({ calendarId: local.id, title: "Merdeka", startDate: "2026-08-31", endDate: "2026-08-31" }).returning().get();
    await db.insert(reminders).values({ eventId: ev.id, minutesBefore: 0, channel: "ntfy" }).run();

    const first = await runCronTick(db, { now: new Date("2026-08-31T01:00:00Z") }); // 09:00 MYT
    expect(first.reminders).toEqual([{ key: "r:1:2026-08-31", status: "sent" }]);
    expect(first.sync).toBeNull();
    expect((await runCronTick(db, { now: new Date("2026-08-31T01:01:00Z") })).reminders).toEqual([]);

    const nightly = await runCronTick(db, { now: new Date("2026-08-31T19:02:00Z") }); // 03:02 MYT
    expect(nightly.sync).toEqual([]); // no subscriptions, but the sync ran
    vi.unstubAllGlobals();
  });
});

describe("dbOptionsFromEnv", () => {
  it("uses Turso when configured", () => {
    vi.stubEnv("TURSO_DATABASE_URL", "libsql://chronolab.turso.io");
    vi.stubEnv("TURSO_AUTH_TOKEN", "tok");
    expect(dbOptionsFromEnv()).toEqual({ url: "libsql://chronolab.turso.io", authToken: "tok" });
  });

  it("explains the fix instead of writing to Vercel's read-only disk", () => {
    vi.stubEnv("TURSO_DATABASE_URL", "");
    vi.stubEnv("VERCEL", "1");
    expect(() => dbOptionsFromEnv()).toThrow(/TURSO_DATABASE_URL/);
  });
});
