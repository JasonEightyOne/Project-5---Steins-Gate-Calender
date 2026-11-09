import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { calendars } from "@/db/schema";
import { createEvent } from "@/app/actions";
import { EventForm } from "@/components/event-form";
import { Flash } from "@/components/flash";
import { isValidYmd, todayIn } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ date?: string; error?: string }> }) {
  const sp = await searchParams;
  const date = sp.date && isValidYmd(sp.date) ? sp.date : todayIn();
  const local = getDb().select().from(calendars).where(eq(calendars.kind, "local")).all();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/?m=${date.slice(0, 7)}`} className="text-sm text-muted hover:text-phosphor">← back to calendar</Link>
      <h1 className="amber my-4 text-2xl">Mark a day</h1>
      <Flash error={sp.error} />
      <div className="panel p-5">
        <EventForm action={createEvent} calendars={local} defaultDate={date} submitLabel="Save to calendar" />
      </div>
    </div>
  );
}
