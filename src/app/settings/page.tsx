import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { CHANNELS, deliveries, type Channel } from "@/db/schema";
import { sendTestNotification } from "@/app/actions";
import { Flash } from "@/components/flash";
import { channelStatus } from "@/lib/notify";
import { ALL_DAY_TIME } from "@/lib/reminders";

export const dynamic = "force-dynamic";

const CHANNEL: Record<Channel, { name: string; setup: string }> = {
  email: { name: "Email", setup: "Add your Gmail address and an app password to .env.local (see the README)." },
  ntfy: { name: "Phone notifications (ntfy)", setup: "Install the ntfy app, pick a private topic, and add its link to .env.local as NTFY_URL." },
};

const STATUS_TEXT = { sent: "Sent", failed: "Failed", pending: "Sending" } as const;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const status = channelStatus();
  const log = await (await getDb()).select().from(deliveries).orderBy(desc(deliveries.id)).limit(25).all();
  const fmt = (d: Date) => d.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="readable">
      <h1 className="t-h1 mb-2">Alerts</h1>
      <p className="mb-8 text-pencil">
        Where reminders are sent. The reminder service checks every minute. All-day reminders arrive at {ALL_DAY_TIME}.
      </p>
      <Flash msg={sp.msg} error={sp.error} />

      <ul className="mb-10">
        {CHANNELS.map((ch) => (
          <li key={ch} className="rule flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <h2 className="t-h3">{CHANNEL[ch].name}</h2>
              <p className="text-[0.9rem]" style={{ color: status[ch].configured ? "var(--ink)" : "var(--pencil)" }}>
                {status[ch].configured ? `Ready. Sends ${status[ch].detail}.` : `Not set up. ${CHANNEL[ch].setup}`}
              </p>
            </div>
            {status[ch].configured && (
              <form action={sendTestNotification.bind(null, ch)}>
                <button className="btn" type="submit">Send a test message</button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <section aria-labelledby="sent" className="rule pt-6">
        <h2 id="sent" className="t-h3 mb-3">Recently sent</h2>
        {log.length === 0 ? (
          <p className="text-pencil">Nothing sent yet. Reminders will be listed here after they go out.</p>
        ) : (
          <table className="w-full text-left text-[0.9rem]">
            <thead className="t-small text-pencil">
              <tr><th className="pb-2 font-normal">When</th><th className="pb-2 font-normal">Reminder</th><th className="pb-2 font-normal">Result</th></tr>
            </thead>
            <tbody>
              {log.map((d) => (
                <tr key={d.id} className="border-t border-grid align-top">
                  <td className="py-2 pr-3 whitespace-nowrap text-pencil">{fmt(d.createdAt)}</td>
                  <td className="py-2 pr-3">{d.title}</td>
                  <td className="py-2" style={{ color: d.status === "failed" ? "var(--holiday)" : "var(--ink)" }}>
                    {STATUS_TEXT[d.status]}
                    {d.error && <span className="t-small block">{d.error}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
