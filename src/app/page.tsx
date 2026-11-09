import Link from "next/link";
import { getDb } from "@/db";
import { Flash } from "@/components/flash";
import { Nixie } from "@/components/nixie";
import {
  MONTH_NAMES,
  addDays,
  diffDays,
  formatLong,
  monthGrid,
  parseYmd,
  shiftMonth,
  todayIn,
} from "@/lib/dates";
import { getOccurrences, groupByDay } from "@/lib/occurrences";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

type Search = Promise<{ m?: string; msg?: string; error?: string }>;

export default async function MonthPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const db = getDb();
  const today = todayIn();
  const t = parseYmd(today);
  const match = /^(\d{4})-(\d{2})$/.exec(sp.m ?? "");
  const year = match ? Number(match[1]) : t.y;
  const month = match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? Number(match[2]) : t.m;

  const grid = monthGrid(year, month);
  const from = grid[0][0];
  const to = grid[5][6];
  const byDay = groupByDay(getOccurrences(db, from, to, { onlyVisible: true }), from, to);

  const upcoming = getOccurrences(db, today, addDays(today, 60), { onlyVisible: true }).filter((o) => o.date >= today);
  const nextHoliday = upcoming.find((o) => o.calendar.isHoliday);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const mParam = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

  return (
    <>
      <Flash msg={sp.msg} error={sp.error} />

      <section className="panel mb-6 flex flex-wrap items-center justify-between gap-6 px-5 py-4">
        <div>
          <div className="label mb-2">Current coordinate</div>
          <Nixie value={today.replaceAll("-", ".")} label={`Today is ${formatLong(today)}`} />
          <div className="mt-2 text-sm text-muted">{formatLong(today)}</div>
        </div>
        <div className="sm:text-right">
          <div className="label mb-2">Next special day</div>
          {nextHoliday ? (
            <>
              <Nixie
                value={`D-${String(diffDays(today, nextHoliday.date)).padStart(2, "0")}`}
                size="clamp(1.3rem, 5vw, 1.75rem)"
                label={`${diffDays(today, nextHoliday.date)} days to go`}
              />
              <div className="mt-2 text-sm">
                <Link href={`/events/${nextHoliday.event.id}`} className="amber hover:underline">
                  {nextHoliday.event.title}
                </Link>
                <span className="text-muted"> · {formatLong(nextHoliday.date)}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted">
              None in the next 60 days. <Link className="crt underline" href="/calendars">Import holidays →</Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
            <h1 className="text-xl">
              <span className="amber">{MONTH_NAMES[month - 1]}</span> <span className="text-muted">{year}</span>
            </h1>
            <div className="flex gap-2">
              <Link className="btn" href={`/?m=${mParam(prev.year, prev.month)}`} aria-label="Previous month">◀</Link>
              <Link className="btn" href="/">Today</Link>
              <Link className="btn" href={`/?m=${mParam(next.year, next.month)}`} aria-label="Next month">▶</Link>
              <Link className="btn btn-primary" href={`/events/new?date=${year === t.y && month === t.m ? today : mParam(year, month) + "-01"}`}>
                + Mark a day
              </Link>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={`label border-b border-line px-1 py-2 sm:px-2 ${i === 0 ? "text-nixie/80" : ""}`}>
                  <span className="sm:hidden">{d[0]}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
              {grid.flat().map((day) => {
                const items = byDay.get(day) ?? [];
                const inMonth = parseYmd(day).m === month;
                const isHoliday = items.some((o) => o.calendar.isHoliday);
                return (
                  <div
                    key={day}
                    className={`day-cell min-w-0 border-b border-r border-line/70 p-0.5 sm:p-1.5 ${inMonth ? "" : "opacity-35"} ${day === today ? "today" : ""} ${isHoliday ? "holiday" : ""}`}
                  >
                    <Link
                      href={`/events/new?date=${day}`}
                      className="day-num mb-1 inline-block rounded px-1 text-sm text-muted hover:text-phosphor"
                      title={`Mark ${formatLong(day)}`}
                    >
                      {parseYmd(day).d}
                    </Link>
                    <div className="space-y-0.5">
                      {items.slice(0, MAX_CHIPS).map((o) => (
                        <Link
                          key={`${o.event.id}-${o.date}`}
                          href={`/events/${o.event.id}`}
                          className="chip"
                          style={{ "--chip": o.calendar.color } as React.CSSProperties}
                          title={`${o.event.title} — ${o.calendar.name}`}
                        >
                          {o.event.startTime && o.date === day ? `${o.event.startTime} ` : ""}
                          {o.event.title}
                        </Link>
                      ))}
                      {items.length > MAX_CHIPS && <div className="px-1 text-[0.65rem] text-muted">+{items.length - MAX_CHIPS} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="panel h-fit p-4">
          <div className="label mb-3">Upcoming · 60 days</div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Nothing scheduled. Click any date to mark it.</p>
          ) : (
            <ol className="space-y-2.5">
              {upcoming.slice(0, 12).map((o) => {
                const d = diffDays(today, o.date);
                return (
                  <li key={`${o.event.id}-${o.date}`} className="flex gap-3 text-sm">
                    <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: o.calendar.color }}>
                      {d === 0 ? "today" : `+${d}d`}
                    </span>
                    <Link href={`/events/${o.event.id}`} className="min-w-0 hover:text-phosphor">
                      <span className="block truncate">{o.event.title}</span>
                      <span className="block text-xs text-muted">{formatLong(o.date)}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </>
  );
}
