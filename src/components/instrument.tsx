import Link from "next/link";
import { getDb } from "@/db";
import { addDays, diffDays, formatLong, todayIn } from "@/lib/dates";
import { getOccurrences } from "@/lib/occurrences";
import { Nixie } from "./nixie";
import { NavLinks } from "./nav-links";

/** The walnut instrument strip: brand, navigation, and the glowing readout (today + next holiday). */
export async function Instrument() {
  const today = todayIn();
  const next = (await getOccurrences(await getDb(), today, addDays(today, 365), { onlyVisible: true })).find(
    (o) => o.calendar.isHoliday && o.date >= today,
  );
  const days = next ? diffDays(today, next.date) : null;

  return (
    <header className="housing">
      <div className="mx-auto max-w-6xl px-4 pt-3 pb-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <Link href="/" className="text-[1.05rem] font-bold no-underline" style={{ color: "var(--nixie-core)" }}>
            Chronolab
          </Link>
          <NavLinks />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-x-10 gap-y-4">
          <div>
            <Nixie value={today.replaceAll("-", ".")} label={`Today is ${formatLong(today)}`} />
            <p className="t-small mt-2">{formatLong(today)}</p>
          </div>
          {next && days != null ? (
            <div>
              <Nixie
                value={String(days).padStart(2, "0")}
                size="clamp(1.25rem, 5.6vw, 2.1rem)"
                label={`${days} days until ${next.event.title}`}
              />
              <p className="t-small mt-2">
                {days === 0 ? "Today is " : days === 1 ? "Tomorrow is " : "days until "}
                <Link href={`/events/${next.event.id}`} className="underline" style={{ color: "var(--nixie-core)" }}>
                  {next.event.title}
                </Link>
              </p>
            </div>
          ) : (
            <p className="t-small max-w-xs pb-1">
              No public holidays loaded yet. <Link href="/calendars" className="underline">Add Malaysia public holidays</Link>
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
