import Link from "next/link";
import { getDb } from "@/db";
import { Flash } from "@/components/flash";
import { MONTH_NAMES, addDays, formatLong, monthGrid, parseYmd, shiftMonth, todayIn } from "@/lib/dates";
import { getOccurrences, groupByDay } from "@/lib/occurrences";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_ENTRIES = 3;

type Search = Promise<{ m?: string; msg?: string; error?: string }>;

const mParam = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

function shortDate(s: string) {
  const { d, m } = parseYmd(s);
  return `${d} ${MONTH_NAMES[m - 1].slice(0, 3)}`;
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
  const upcoming = (await getOccurrences(db, today, addDays(today, 60), { onlyVisible: true })).filter((o) => o.date >= today);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrentMonth = year === t.y && month === t.m;
  const markDate = isCurrentMonth ? today : `${mParam(year, month)}-01`;

  return (
    <>
      <Flash msg={sp.msg} error={sp.error} />

      <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[1fr_16rem]">
        <section aria-labelledby="month-title">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <h1 id="month-title" className="t-h1">
              {MONTH_NAMES[month - 1]} {year}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <Link className="btn" href={`/?m=${mParam(prev.year, prev.month)}`} aria-label={`${MONTH_NAMES[prev.month - 1]} ${prev.year}`}>‹</Link>
              <Link className="btn" href="/" aria-disabled={isCurrentMonth}>Today</Link>
              <Link className="btn" href={`/?m=${mParam(next.year, next.month)}`} aria-label={`${MONTH_NAMES[next.month - 1]} ${next.year}`}>›</Link>
              <Link className="btn btn-ink ml-1 no-underline" href={`/events/new?date=${markDate}`}>Mark a day</Link>
            </div>
          </div>

          <div className="month grid grid-cols-7" role="grid" aria-labelledby="month-title">
            {WEEKDAYS.map((d) => (
              <div key={d} role="columnheader" className="px-1.5 py-1.5 t-small text-pencil sm:px-2" title={d}>
                <span className="sm:hidden">{d[0]}</span>
                <span className="hidden sm:inline">{d.slice(0, 3)}</span>
              </div>
            ))}
            {grid.flat().map((day) => {
              const items = byDay.get(day) ?? [];
              const outside = parseYmd(day).m !== month;
              const holiday = items.some((o) => o.calendar.isHoliday);
              const cls = ["day-cell min-w-0 p-0.5 sm:p-1", outside && "outside", day === today && "today", holiday && "holiday"]
                .filter(Boolean)
                .join(" ");
              return (
                <div key={day} role="gridcell" className={cls}>
                  <Link
                    href={`/events/new?date=${day}`}
                    className="day-num"
                    aria-label={`${formatLong(day)}${day === today ? ", today" : ""}${items.length ? `, ${items.length} event${items.length > 1 ? "s" : ""}` : ""}. Mark this day`}
                  >
                    {parseYmd(day).d}
                  </Link>
                  <div className="mt-0.5">
                    {items.slice(0, MAX_ENTRIES).map((o) => (
                      <Link
                        key={`${o.event.id}-${o.date}`}
                        href={`/events/${o.event.id}`}
                        className={`entry${o.calendar.isHoliday ? " is-holiday" : ""}`}
                        style={{ "--entry": o.calendar.color } as React.CSSProperties}
                        title={`${o.event.title} (${o.calendar.name})`}
                      >
                        {o.event.startTime && o.date === day ? `${o.event.startTime} ` : ""}
                        {o.event.title}
                      </Link>
                    ))}
                    {items.length > MAX_ENTRIES && (
                      <span className="block px-1.5 text-[0.7rem] text-pencil">and {items.length - MAX_ENTRIES} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="t-small mt-3 text-pencil">
            <span className="font-bold text-holiday">Red</span> is a public holiday. <span className="text-own">Blue</span> is a day you marked. Select a date to mark it.
          </p>
        </section>

        <aside aria-labelledby="coming-up">
          <h2 id="coming-up" className="t-h3 mb-4">Coming up</h2>
          {upcoming.length === 0 ? (
            <p className="text-[0.9rem]">
              Nothing in the next 60 days. <Link href={`/events/new?date=${today}`}>Mark a day</Link> or{" "}
              <Link href="/calendars">add Malaysia public holidays</Link>.
            </p>
          ) : (
            <ol className="margin-list space-y-3">
              {upcoming.slice(0, 12).map((o) => (
                <li key={`${o.event.id}-${o.date}`}>
                  <span className="when">{o.date === today ? "Today" : shortDate(o.date)}</span>
                  <Link
                    href={`/events/${o.event.id}`}
                    className="what text-[0.9rem] no-underline hover:underline"
                    style={{ color: o.calendar.isHoliday ? "var(--holiday)" : "var(--ink)" }}
                  >
                    <span className="block truncate">{o.event.title}</span>
                    {o.event.startTime && <span className="t-small block text-pencil">{o.event.startTime}</span>}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </>
  );
}
