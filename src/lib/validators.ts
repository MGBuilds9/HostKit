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
