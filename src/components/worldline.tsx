import Link from "next/link";
import { getDb } from "@/db";
import { MONTH_NAMES, diffDays, formatLong, isLeapYear, parseYmd, todayIn, ymd } from "@/lib/dates";
import { getOccurrences } from "@/lib/occurrences";

/**
 * The world line: this year as one thin line. Month ticks jump to that month,
 * public holidays are red ticks, and today is the glowing amber marker.
 */
export async function Worldline() {
  const today = todayIn();
  const { y } = parseYmd(today);
  const start = ymd(y, 1, 1);
  const days = isLeapYear(y) ? 366 : 365;
  const pos = (date: string) => `${((diffDays(start, date) + 0.5) / days) * 100}%`;

  const holidays = (await getOccurrences(await getDb(), start, ymd(y, 12, 31), { onlyVisible: true })).filter(
    (o) => o.calendar.isHoliday,
  );

  return (
    <nav aria-label={`${y} at a glance`} className="worldline mx-auto max-w-6xl px-4">
      <div className="worldline-track">
        {MONTH_NAMES.map((name, i) => {
          const first = ymd(y, i + 1, 1);
          return (
            <Link
              key={name}
              href={`/?m=${first.slice(0, 7)}`}
              className="worldline-month"
              style={{ left: pos(first) }}
              aria-label={`${name} ${y}`}
            >
              <span className="max-sm:hidden">{name.slice(0, 3)}</span>
              <span className="sm:hidden">{name[0]}</span>
            </Link>
          );
        })}
        {holidays.map((o) => (
          <span
            key={`${o.event.id}-${o.date}`}
            className="worldline-holiday"
            style={{ left: pos(o.date) }}
            title={`${o.event.title}, ${formatLong(o.date)}`}
            aria-hidden
          />
        ))}
        <span className="worldline-now" style={{ left: pos(today) }} title={`Today, ${formatLong(today)}`} aria-hidden />
      </div>
    </nav>
  );
}
