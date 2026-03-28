import { z } from "zod";
import { icalSettingsSchema, turnoverRulesSchema } from "@/lib/validators";

export const combinedSchema = icalSettingsSchema.merge(turnoverRulesSchema);
export type CombinedValues = z.infer<typeof combinedSchema>;

export const COMMON_TIMEZONES = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Halifax",
  "America/St_Johns",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

export interface Cleaner {
  id: string;
  fullName: string;
}
