import { z } from "zod";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Step 1: Basics
// NOTE: No .transform() here — slug auto-gen is on the combined schema.
export const propertyBasicsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  ownerId: z.string().uuid("Owner is required"),
  addressStreet: z.string().min(1, "Street is required"),
  addressUnit: z.string().optional(),
  addressCity: z.string().min(1, "City is required"),
  addressProvince: z.string().min(1, "Province is required"),
  addressPostal: z.string().min(1, "Postal code is required"),
  addressCountry: z.string().default("Canada"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  floor: z.string().optional(),
  layout: z.string().optional(),
  beds: z.array(z.object({
    type: z.string(),
    count: z.number().int().positive(),
    location: z.string(),
  })).optional(),
});

// Step 2: Access & Check-In
export const propertyAccessSchema = z.object({
  wifiName: z.string().optional(),
  wifiPassword: z.string().optional(),
  parkingSpot: z.string().optional(),
  parkingInstructions: z.string().optional(),
  buzzerName: z.string().optional(),
  buzzerInstructions: z.string().optional(),
  guestAccessCode: z.string().optional(),
  checkinTime: z.string().default("15:00"),
  checkoutTime: z.string().default("11:00"),
  preArrivalLeadMins: z.number().int().default(30),
  checkinSteps: z.array(z.object({
    step: z.number().int(),
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
    mediaUrl: z.string().optional(),
    mediaType: z.enum(["image", "video"]).optional(),
    posterUrl: z.string().optional(),
  })).optional(),
  checkoutSteps: z.array(z.object({
    step: z.number().int(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  securityNote: z.string().optional(),
});

// Step 3: Amenities & Rules
export const propertyAmenitiesSchema = z.object({
  kitchenAmenities: z.array(z.string()).optional(),
  bathroomAmenities: z.array(z.string()).optional(),
  generalAmenities: z.array(z.string()).optional(),
  houseRules: z.array(z.object({
    rule: z.string(),
    icon: z.string().optional(),
  })).optional(),
  idRequired: z.boolean().default(true),
  idLeadHours: z.number().int().default(72),
  thirdPartyAllowed: z.boolean().default(false),
});

// Step 4: Nearby & Emergency
export const propertyNearbySchema = z.object({
  nearbyServices: z.array(z.object({
    name: z.string(),
    category: z.enum(["grocery", "restaurant", "pharmacy", "hospital", "transit", "gas", "gym", "park", "entertainment", "other"]),
    address: z.string().optional(),
    distance: z.string().optional(),
    googleMapsUrl: z.string().url().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
  emergencyContact: z.string().optional(),
  hostPhone: z.string().optional(),
  ownerPhone: z.string().optional(),
  thermostatDefault: z.string().default("22°C"),
});

// Full property — uses .merge() (not .and()) then .transform() for slug
export const createPropertySchema = propertyBasicsSchema
  .merge(propertyAccessSchema)
  .merge(propertyAmenitiesSchema)
  .merge(propertyNearbySchema)
  .transform((data) => ({
    ...data,
    slug: data.slug || slugify(data.name),
  }));

// Partial update — all fields optional, used by PATCH /api/properties/[id]
export const partialPropertySchema = propertyBasicsSchema
  .merge(propertyAccessSchema)
  .merge(propertyAmenitiesSchema)
  .merge(propertyNearbySchema)
  .partial();

// Owner
export const createOwnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  userId: z.string().uuid().optional(),
});

// ── Calendar / Sync ──────────────────────────────────────

export const icalSettingsSchema = z.object({
  airbnbIcalUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  googleCalendarId: z.string().optional().or(z.literal("")),
  icalSyncEnabled: z.boolean().default(false),
  syncIntervalMinutes: z.number().int().min(5).max(1440).default(15),
});

export const turnoverRulesSchema = z.object({
  cleanOn: z.enum(["checkout", "checkin", "both"]).default("checkout"),
  cleanStartOffsetHours: z.number().int().min(0).max(24).default(0),
  cleanDurationHours: z.number().int().min(1).max(12).default(3),
  defaultCleanerId: z.string().uuid().optional().or(z.literal("")),
  sameDayTurnAllowed: z.boolean().default(false),
  timezone: z.string().default("America/Toronto"),
});

export const cleaningTaskUpdateSchema = z.object({
  status: z.enum(["pending", "offered", "accepted", "in_progress", "completed", "cancelled"]).optional(),
  assignedCleanerId: z.string().uuid().optional().or(z.literal("")).nullable(),
  notes: z.string().optional(),
  checklistData: z.array(z.object({
    title: z.string(),
    items: z.array(z.object({
      label: z.string(),
      type: z.string(),
      completed: z.boolean(),
    })),
  })).optional(),
});

export const calendarQuerySchema = z.object({
  from: z.string().datetime().or(z.string().date()),
  to: z.string().datetime().or(z.string().date()),
  propertyId: z.string().uuid().optional(),
});

export const createCleanerSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  userId: z.string().uuid().optional(),
});

// ── Users ─────────────────────────────────────────────────

export const userRoleUpdateSchema = z.object({
  role: z.enum(["admin", "owner", "manager", "cleaner"]),
});

// Admin user editor — all fields optional, used by PATCH /api/users/[id]
export const userUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "owner", "manager", "cleaner"]).optional(),
  isActive: z.boolean().optional(),
});

// ── Owner Statements ──────────────────────────────────────

export const createStatementSchema = z.object({
  propertyId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM format"),
  revenue: z.number().int().min(0).default(0),
  expenses: z.number().int().min(0).default(0),
  payout: z.number().int().min(0).default(0),
  status: z.enum(["draft", "sent", "paid"]).default("draft"),
  notes: z.string().optional(),
});

// ── Stays ─────────────────────────────────────────────────

export const createStaySchema = z.object({
  guestName: z.string().optional(),
  startDate: z.string().datetime().or(z.string().date()),
  endDate: z.string().datetime().or(z.string().date()),
  source: z.enum(["airbnb", "google", "manual"]).default("manual"),
  status: z.enum(["booked", "blocked", "cancelled"]).default("booked"),
});

// PATCH /api/properties/[id]/stays/[stayId] — all fields optional.
// Any field present is applied; omitted fields are left unchanged.
export const stayUpdateSchema = z.object({
  status: z.enum(["booked", "blocked", "cancelled"]).optional(),
  guestName: z.string().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  rawSummary: z.string().optional().nullable(),
  rawDescription: z.string().optional().nullable(),
  isManual: z.boolean().optional(),
});

// ── Owner Documents ───────────────────────────────────────

export const createDocumentSchema = z.object({
  type: z.enum(["lease", "tax", "insurance", "other"]),
  name: z.string().min(1),
  fileUrl: z.string().url(),
});

// ── Google Calendar Onboarding (CONNECT-CALENDAR) ──────────

/**
 * A single entry from Google's calendarList.list API as surfaced to clients.
 * `primary` marks the Google account's own primary calendar.
 */
export const googleCalendarListEntrySchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  primary: z.boolean().default(false),
});

/** Outbound shape of GET /api/me/calendars. */
export const googleCalendarListResponseSchema = z.object({
  calendars: z.array(googleCalendarListEntrySchema),
});

/** Optional body for POST /api/properties/[id]/calendar-connection. */
export const connectCalendarBodySchema = z.object({
  googleCalendarId: z.string().trim().min(1).max(512).optional(),
});

// ── Invites ───────────────────────────────────────────────

export const createInviteSchema = z
  .object({
    email: z.string().email("Invalid email"),
    intendedRole: z.enum(["owner", "manager", "cleaner"]),
    propertyId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    ownerName: z.string().min(1).optional(),
    expiresInDays: z.number().int().min(1).max(30).default(14),
  })
  .superRefine((data, ctx) => {
    if (data.intendedRole === "manager") {
      if (!data.propertyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Manager invites require a propertyId",
          path: ["propertyId"],
        });
      }
      if (data.ownerId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Manager invites must not include ownerId",
          path: ["ownerId"],
        });
      }
    }
    if (data.intendedRole === "owner") {
      if (!data.ownerId && !data.ownerName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner invites require either ownerId or ownerName",
          path: ["ownerId"],
        });
      }
      if (data.propertyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner invites must not include propertyId",
          path: ["propertyId"],
        });
      }
    }
  });
