import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { calendars } from "@/db/schema";
import { createEvent } from "@/app/actions";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { MONTH_NAMES, isValidYmd, parseYmd, todayIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string }> }) {
  const sp = await searchParams;
  const date = sp.date && isValidYmd(sp.date) ? sp.date : todayIn();
  const { y, m } = parseYmd(date);
  const local = getDb().select().from(calendars).where(eq(calendars.kind, "local")).all();
  return (
    <div className="readable">
      <Link href={`/?m=${date.slice(0, 7)}`} className="t-small">Back to {MONTH_NAMES[m - 1]} {y}</Link>
      <h1 className="t-h1 mt-3 mb-6">Mark a day</h1>
      <Flash error={sp.error} />
      <EventForm action={createEvent} calendars={local} defaultDate={date} submitLabel="Save day" />
    </div>
  );
}
