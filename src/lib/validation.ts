import { z } from "zod";
import { CHANNELS } from "@/db/schema";
import { isValidYmd } from "./dates";
import { MAX_OFFSET_MINUTES } from "./reminders";

const ymdField = z.string().refine(isValidYmd, "Use a valid date (YYYY-MM-DD)");
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());

export const minutesField = z.coerce.number().int().min(0).max(MAX_OFFSET_MINUTES);
export const channelField = z.enum(CHANNELS);

export const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: optional(z.string().trim().max(2000)),
    calendarId: z.coerce.number().int().positive(),
    startDate: ymdField,
    endDate: optional(ymdField),
    startTime: optional(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")),
    recurrence: z.enum(["none", "yearly"]).default("none"),
    reminderMinutes: optional(minutesField),
    reminderChannel: optional(channelField),
  })
  .transform((v) => ({ ...v, endDate: v.endDate ?? v.startDate }))
  .refine((v) => v.endDate >= v.startDate, { message: "End date must be on or after the start date", path: ["endDate"] });

export const reminderSchema = z.object({ minutesBefore: minutesField, channel: channelField });

export const colorField = z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ff8a2a");

export const subscribeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z
    .string()
    .trim()
    .transform((u) => u.replace(/^webcals?:\/\//i, "https://"))
    .pipe(z.string().url("Enter a valid http(s) or webcal:// URL").refine((u) => /^https?:\/\//i.test(u), "Only http(s) URLs")),
  color: colorField,
  isHoliday: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const calendarDefaultsSchema = z.object({
  defaultReminderMinutes: optional(minutesField),
  defaultReminderChannel: optional(channelField),
});

export function formToObject(fd: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(fd.entries());
}

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid input";
}
