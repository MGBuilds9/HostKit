import { db } from "@/db";
import { stays, cleaningTasks, properties } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Given a JS Date (used only for its calendar date) and a "HH:MM" time string,
 * return a new Date set to that time on that calendar day, interpreted in the
 * property's timezone via the Intl offset trick.
 *
 * We avoid a full timezone library by computing the UTC offset for the target
 * wall-clock instant and adjusting accordingly.
 */
function combineDateAndTime(date: Date, timeStr: string, timezone: string): Date {
  const [hourStr, minuteStr] = timeStr.split(":");
  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr ?? "0", 10);

  // Build a wall-clock date string in the target timezone.
  // toLocaleDateString gives us "M/D/YYYY" in en-US for the given tz.
  const localDateStr = date.toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
  const wallClockStr = `${localDateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  // Parse the wall-clock string as if it were UTC to get a baseline Date.
  const naiveUtc = new Date(`${wallClockStr}Z`);

  // Compute the actual UTC offset for this wall-clock instant in the given tz.
  // We do this by formatting naiveUtc in the target timezone and measuring drift.
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(naiveUtc);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const localYear = get("year");
  const localMonth = get("month") - 1;
  const localDay = get("day");
  const localHour = get("hour") === 24 ? 0 : get("hour"); // midnight edge case
  const localMinute = get("minute");
  const localSecond = get("second");

  const localAsUtc = Date.UTC(localYear, localMonth, localDay, localHour, localMinute, localSecond);
  const offsetMs = naiveUtc.getTime() - localAsUtc;

  return new Date(naiveUtc.getTime() + offsetMs);
}

/** Add N hours to a Date, returning a new Date. */
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

/**
 * Return "YYYY-MM-DD" for the given Date in the specified timezone.
 * Used to compare calendar days without caring about UTC midnight boundaries.
 */
function toLocalDateString(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone }); // returns "YYYY-MM-DD"
}

// ── Core logic ─────────────────────────────────────────────────────────────

interface TaskSpec {
  triggerType: "checkout" | "checkin";
  scheduledStart: Date;
  scheduledEnd: Date;
  priority: number;
  notes: string | null;
}

function buildTaskSpecs(
  stay: { startDate: Date; endDate: Date },
  property: {
    cleanOn: string | null;
    cleanStartOffsetHours: number | null;
    cleanDurationHours: number | null;
    checkoutTime: string;
    checkinTime: string;
    timezone: string | null;
    sameDayTurnAllowed: boolean | null;
  },
  isSameDayTurn: boolean
): TaskSpec[] {
  const cleanOn = property.cleanOn ?? "checkout";
  const offsetHours = property.cleanStartOffsetHours ?? 0;
  const durationHours = property.cleanDurationHours ?? 3;
  const timezone = property.timezone ?? "America/Toronto";

  const priority = isSameDayTurn ? 1 : 0;
  const notes = isSameDayTurn ? "Same-day turnover" : null;

  const specs: TaskSpec[] = [];

  if (cleanOn === "checkout" || cleanOn === "both") {
    // Task starts at checkout time on stay.endDate + offsetHours
    const checkoutWall = combineDateAndTime(stay.endDate, property.checkoutTime, timezone);
    const start = addHours(checkoutWall, offsetHours);
    const end = addHours(start, durationHours);
    specs.push({ triggerType: "checkout", scheduledStart: start, scheduledEnd: end, priority, notes });
  }

  if (cleanOn === "checkin" || cleanOn === "both") {
    // Task ends at checkin time on stay.startDate - offsetHours; start = end - duration
    const checkinWall = combineDateAndTime(stay.startDate, property.checkinTime, timezone);
    const end = addHours(checkinWall, -offsetHours);
    const start = addHours(end, -durationHours);
    specs.push({ triggerType: "checkin", scheduledStart: start, scheduledEnd: end, priority, notes });
  }

  return specs;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate (or update) cleaning tasks for the given stay.
 *
 * - Skips stays that are "blocked" or "cancelled".
 * - Respects property.cleanOn ("checkout" | "checkin" | "both").
 * - Upserts: if a task for this stay + triggerType already exists, updates it;
 *   otherwise inserts a new one.
 * - Detects same-day turns and bumps priority + adds a note.
 */
export async function generateCleaningTasks(stayId: string): Promise<void> {
  // Load stay
  const [stay] = await db
    .select()
    .from(stays)
    .where(eq(stays.id, stayId))
    .limit(1);

  if (!stay) {
    throw new Error(`Stay not found: ${stayId}`);
  }

  // Skip non-bookable statuses
  if (stay.status === "blocked" || stay.status === "cancelled") {
    return;
  }

  // Load property
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, stay.propertyId))
    .limit(1);

  if (!property) {
    throw new Error(`Property not found for stay ${stayId}: ${stay.propertyId}`);
  }

  const timezone = property.timezone ?? "America/Toronto";

  // Detect same-day turn: is there another booked stay that starts on the same
  // calendar day this stay ends?
  const checkoutDayStr = toLocalDateString(stay.endDate, timezone);

  const siblingStays = await db
    .select({ id: stays.id, startDate: stays.startDate })
    .from(stays)
    .where(
      and(
        eq(stays.propertyId, stay.propertyId),
        eq(stays.status, "booked"),
        ne(stays.id, stayId)
      )
    );

  const isSameDayTurn = siblingStays.some(
    (s) => toLocalDateString(s.startDate, timezone) === checkoutDayStr
  );

  // Build the task specs for this stay
  const specs = buildTaskSpecs(stay, property, isSameDayTurn);

  // Upsert each spec
  for (const spec of specs) {
    const [existing] = await db
      .select({ id: cleaningTasks.id })
      .from(cleaningTasks)
      .where(
        and(
          eq(cleaningTasks.stayId, stayId),
          eq(cleaningTasks.triggerType, spec.triggerType)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(cleaningTasks)
        .set({
          scheduledStart: spec.scheduledStart,
          scheduledEnd: spec.scheduledEnd,
          priority: spec.priority,
          notes: spec.notes,
          assignedCleanerId: property.defaultCleanerId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(cleaningTasks.id, existing.id));
    } else {
      await db.insert(cleaningTasks).values({
        propertyId: stay.propertyId,
        stayId,
        triggerType: spec.triggerType,
        scheduledStart: spec.scheduledStart,
        scheduledEnd: spec.scheduledEnd,
        status: "pending",
        assignedCleanerId: property.defaultCleanerId ?? null,
        priority: spec.priority,
        notes: spec.notes,
      });
    }
  }
}

/**
 * Cancel all non-completed cleaning tasks for a stay.
 * Call this when a stay is cancelled or removed.
 */
export async function cancelCleaningTasksForStay(stayId: string): Promise<void> {
  await db
    .update(cleaningTasks)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(cleaningTasks.stayId, stayId),
        ne(cleaningTasks.status, "completed")
      )
    );
}
