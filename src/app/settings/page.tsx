import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { CHANNELS, deliveries } from "@/db/schema";
import { sendTestNotification } from "@/app/actions";
import { Flash } from "@/components/flash";
import { CHANNEL_LABELS } from "@/components/reminder-fields";
import { channelStatus } from "@/lib/notify";
import { ALL_DAY_TIME } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const status = channelStatus();
  const log = getDb().select().from(deliveries).orderBy(desc(deliveries.id)).limit(25).all();

  return (
    <div className="space-y-6">
      <h1 className="amber text-2xl">Notifications</h1>
      <Flash msg={sp.msg} error={sp.error} />

      <section className="panel divide-y divide-line">
        {CHANNELS.map((ch) => (
          <div key={ch} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div>{CHANNEL_LABELS[ch]}</div>
              <div className={`text-xs ${status[ch].configured ? "crt" : "text-muted"}`}>
                {status[ch].configured ? "● online " : "○ not configured: "}{status[ch].detail}
              </div>
            </div>
            <form action={sendTestNotification.bind(null, ch)}>
              <button className="btn" type="submit" disabled={!status[ch].configured}>Send test</button>
            </form>
          </div>
        ))}
      </section>

      <section className="panel p-5 text-sm leading-relaxed">
        <h2 className="label mb-2">How reminders are delivered</h2>
        <p className="text-muted">
          The background worker (<code className="crt">pnpm worker</code>) checks every minute and sends anything due. All-day events
          use {ALL_DAY_TIME} Malaysia time. Channels are configured in <code className="crt">.env.local</code>. See the README for Gmail
          app-password and ntfy setup.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="label mb-3">Recent deliveries</h2>
        {log.length === 0 ? (
          <p className="text-sm text-muted">Nothing sent yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {log.map((d) => (
                <tr key={d.id} className="border-t border-line/60">
                  <td className="py-1.5 pr-3 text-xs text-muted">{d.createdAt.toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}</td>
                  <td className="py-1.5 pr-3">{d.title}</td>
                  <td className="py-1.5 pr-3 text-xs">{d.channel}</td>
                  <td className={`py-1.5 text-xs ${d.status === "sent" ? "crt" : d.status === "failed" ? "text-danger" : "text-muted"}`} title={d.error ?? ""}>
                    {d.status}
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
