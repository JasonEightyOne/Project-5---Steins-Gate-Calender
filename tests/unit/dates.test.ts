import { describe, expect, it } from "vitest";
import { addDays, diffDays, isValidYmd, monthGrid, shiftMonth, todayIn, zonedToUtc } from "@/lib/dates";

describe("dates", () => {
  it("does calendar arithmetic across month and leap boundaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-01-01", "2026-03-01")).toBe(59);
  });

  it("validates YYYY-MM-DD", () => {
    expect(isValidYmd("2026-02-29")).toBe(false);
    expect(isValidYmd("2028-02-29")).toBe(true);
    expect(isValidYmd("2026-1-1")).toBe(false);
  });

  it("converts Malaysia wall-clock time to UTC (UTC+8)", () => {
    expect(zonedToUtc("2026-11-20", "09:00", "Asia/Kuala_Lumpur").toISOString()).toBe("2026-11-20T01:00:00.000Z");
    expect(todayIn("Asia/Kuala_Lumpur", new Date("2026-12-31T16:30:00Z"))).toBe("2027-01-01");
  });

  it("handles DST zones too", () => {
    expect(zonedToUtc("2026-07-01", "09:00", "Europe/London").toISOString()).toBe("2026-07-01T08:00:00.000Z");
  });

  it("builds a Sunday-first 6-week grid", () => {
    const grid = monthGrid(2026, 11);
    expect(grid).toHaveLength(6);
    expect(grid[0][0]).toBe("2026-11-01"); // 1 Nov 2026 is a Sunday
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
