import type { Channel } from "@/db/schema";

export const OFFSET_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "On the day / at start" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
  { value: 4320, label: "3 days before" },
  { value: 10080, label: "1 week before" },
  { value: 20160, label: "2 weeks before" },
];

export const CHANNEL_LABELS: Record<Channel, string> = { email: "Email (Gmail)", ntfy: "Phone push (ntfy)" };

export function OffsetSelect({ name, defaultValue, allowNone }: { name: string; defaultValue?: number | null; allowNone?: boolean }) {
  return (
    <select name={name} className="field" defaultValue={defaultValue ?? (allowNone ? "" : 1440)}>
      {allowNone && <option value="">No reminder</option>}
      {OFFSET_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function ChannelSelect({ name, defaultValue }: { name: string; defaultValue?: Channel | null }) {
  return (
    <select name={name} className="field" defaultValue={defaultValue ?? "email"}>
      {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => (
        <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
      ))}
    </select>
  );
}
