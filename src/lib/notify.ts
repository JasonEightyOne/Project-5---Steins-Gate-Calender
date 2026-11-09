import nodemailer from "nodemailer";
import type { Channel } from "@/db/schema";

export type Message = { title: string; body: string };

export function channelStatus(): Record<Channel, { configured: boolean; detail: string }> {
  const email = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_TO);
  const ntfy = Boolean(process.env.NTFY_URL);
  return {
    email: { configured: email, detail: email ? `to ${process.env.MAIL_TO}` : "set SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_TO" },
    ntfy: { configured: ntfy, detail: ntfy ? process.env.NTFY_URL! : "set NTFY_URL" },
  };
}

async function sendEmail(msg: Message): Promise<void> {
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to: process.env.MAIL_TO,
    subject: msg.title,
    text: msg.body,
  });
}

/**
 * ntfy.sh (or self-hosted ntfy) push notification to phone/desktop.
 * Uses ntfy's JSON publish API (POST to the server root) so titles can contain emoji/non-ASCII.
 */
async function sendNtfy(msg: Message): Promise<void> {
  const url = new URL(process.env.NTFY_URL!);
  const topic = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!topic) throw new Error("NTFY_URL must include a topic, e.g. https://ntfy.sh/my-topic");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  const res = await fetch(url.origin + "/", {
    method: "POST",
    headers,
    body: JSON.stringify({ topic, title: msg.title, message: msg.body, tags: ["calendar"] }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`ntfy responded HTTP ${res.status}`);
}

export async function send(channel: Channel, msg: Message): Promise<void> {
  const status = channelStatus()[channel];
  if (!status.configured) throw new Error(`${channel} is not configured (${status.detail})`);
  if (channel === "email") return sendEmail(msg);
  return sendNtfy(msg);
}
