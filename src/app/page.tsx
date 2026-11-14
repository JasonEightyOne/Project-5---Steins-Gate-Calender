import Link from "next/link";
import { getDb } from "@/db";
import { Flash } from "@/components/flash";
import { Nixie } from "@/components/nixie";
import { MONTH_NAMES, addDays, dayOfWeek, diffDays, formatLong, monthGrid, parseYmd, shiftMonth, todayIn } from "@/lib/dates";
import { getOccurrences, groupByDay, type Occurrence } from "@/lib/occurrences";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_ENTRIES = 3;

type Search = Promise<{ m?: string; msg?: string; error?: string }>;

const mParam = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

function shortDate(s: string) {
  const { d, m } = parseYmd(s);
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)}`;
}

function inDays(n: number) {
  return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
}

function entryClass(o: Occurrence) {
  if (o.calendar.isHoliday) return "entry is-holiday";
  return o.calendar.kind === "local" ? "entry is-own" : "entry";
}

export default async function MonthPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const db = await getDb();
  const today = todayIn();
  const t = parseYmd(today);
  const match = /^(\d{4})-(\d{2})$/.exec(sp.m ?? "");
  const year = match ? Number(match[1]) : t.y;
  const month = match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? Number(match[2]) : t.m;

  const grid = monthGrid(year, month);
  const from = grid[0][0];
  const to = grid[5][6];
  const byDay = groupByDay(await getOccurrences(db, from, to, { onlyVisible: true }), from, to);

  const ahead = (await getOccurrences(db, today, addDays(today, 365), { onlyVisible: true })).filter((o) => o.date >= today);
  const nextHoliday = ahead.find((o) => o.calendar.isHoliday);
  const upcoming = ahead.filter((o) => o !== nextHoliday && o.date <= addDays(today, 60)).slice(0, 10);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrentMonth = year === t.y && month === t.m;
  const markDate = isCurrentMonth ? today : `${mParam(year, month)}-01`;

  return (
    <>
      <Flash msg={sp.msg} error={sp.error} />

      <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[1fr_17rem]">
        <section aria-labelledby="month-title" className="min-w-0">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <h1 id="month-title" key={`${year}-${month}`} className={`t-h1${sp.m ? " leap" : ""}`}>
              {MONTH_NAMES[month - 1]} {year}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link className="btn" href={`/?m=${mParam(prev.year, prev.month)}`} aria-label={`Previous month, ${MONTH_NAMES[prev.month - 1]} ${prev.year}`}>‹</Link>
              <Link className="btn" href="/">Today</Link>
              <Link className="btn" href={`/?m=${mParam(next.year, next.month)}`} aria-label={`Next month, ${MONTH_NAMES[next.month - 1]} ${next.year}`}>›</Link>
              <Link className="btn btn-primary ml-2" href={`/events/new?date=${markDate}`}>Mark a day</Link>
            </div>
          </div>

          <div role="grid" aria-labelledby="month-title">
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((d, i) => (
                <div key={d} role="columnheader" title={d} className={`px-0.5 pb-2 t-small sm:px-1.5 ${i === 0 ? "text-off" : "text-muted"}`}>
                  <span className="sm:hidden">{d[0]}</span>
                  <span className="hidden sm:inline">{d.slice(0, 3)}</span>
                </div>
              ))}
            </div>

            {grid.filter((week) => week.some((d) => parseYmd(d).m === month)).map((week) => (
              <div key={week[0]} role="row" className="week grid grid-cols-7">
                {week.map((day) => {
                  const items = byDay.get(day) ?? [];
                  const isToday = day === today;
                  const cls = [
                    "day-cell",
                    parseYmd(day).m !== month && "outside",
                    dayOfWeek(day) === 0 && "sunday",
                    items.some((o) => o.calendar.isHoliday) && "holiday",
                    isToday && "today",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const label = `${formatLong(day)}${isToday ? ", today" : ""}${items.length ? `, ${items.length} event${items.length > 1 ? "s" : ""}` : ""}. Mark this day`;
                  return (
                    <div key={day} role="gridcell" className={cls}>
                      <Link href={`/events/new?date=${day}`} className="day-num" aria-label={label}>
                        {isToday ? <Nixie value={String(parseYmd(day).d)} size="1.15rem" label="" /> : parseYmd(day).d}
                      </Link>
                      <div className="entries mt-1 space-y-0.5">
                        {items.slice(0, MAX_ENTRIES).map((o) => (
                          <Link
                            key={`${o.event.id}-${o.date}`}
                            href={`/events/${o.event.id}`}
                            className={entryClass(o)}
                            style={{ "--entry": o.calendar.color } as React.CSSProperties}
                            title={`${o.event.title} (${o.calendar.name})`}
                          >
                            <span>
                              {o.event.startTime && o.date === day ? `${o.event.startTime} ` : ""}
                              {o.event.title}
                            </span>
                          </Link>
                        ))}
                        {items.length > MAX_ENTRIES && (
                          <span className="block text-[0.72rem] text-muted max-sm:hidden">and {items.length - MAX_ENTRIES} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <aside aria-labelledby="up-next" className="min-w-0">
          <h2 id="up-next" className="t-h3 mb-3">Up next</h2>

          {nextHoliday && (
            <Link href={`/events/${nextHoliday.event.id}`} className="mb-5 block no-underline">
              <span className="block text-[1.05rem] font-semibold text-off">{nextHoliday.event.title}</span>
              <span className="block text-[0.9rem] text-muted">
                Public holiday {inDays(diffDays(today, nextHoliday.date))}
              </span>
              <span className="block text-[0.9rem] text-muted">{formatLong(nextHoliday.date)}</span>
            </Link>
          )}

          {upcoming.length === 0 && !nextHoliday ? (
            <p className="text-[0.92rem] text-muted">
              Nothing coming up. <Link href={`/events/new?date=${today}`}>Mark a day</Link> or{" "}
              <Link href="/calendars">add Malaysia public holidays</Link>.
            </p>
          ) : (
            <ol className="next-list text-[0.92rem]">
              {upcoming.map((o) => (
                <li key={`${o.event.id}-${o.date}`}>
                  <span className="text-muted">{o.date === today ? "Today" : shortDate(o.date)}</span>
                  <Link
                    href={`/events/${o.event.id}`}
                    className="truncate no-underline hover:underline"
                    style={{ color: o.calendar.isHoliday ? "var(--off)" : "var(--ink)" }}
                  >
                    {o.event.title}
                  </Link>
                  <span className="t-small text-muted">{o.event.startTime ?? ""}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </>
  );
}
