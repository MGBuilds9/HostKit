import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// ── Enums ──────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "owner", "manager"]);

// ── NextAuth Required Tables ───────────────────────────
// NOTE: `name` is nullable (differs from PRD which says notNull).
// NextAuth adapter requires name to be nullable because Google accounts
// don't always provide a display name on first OAuth callback.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("owner"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ============================================================
// OWNERS
// ============================================================

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// PROPERTIES
// ============================================================

export const properties = pgTable("properties", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .references(() => owners.id)
    .notNull(),

  // Identity
  name: text("name").notNull(), // "Kith 1423"
  slug: text("slug").notNull().unique(), // "kith-1423"
  description: text("description"), // Short tagline for guest guide hero

  // Address
  addressStreet: text("address_street").notNull(),
  addressUnit: text("address_unit"),
  addressCity: text("address_city").notNull(),
  addressProvince: text("address_province").notNull(),
  addressPostal: text("address_postal").notNull(),
  addressCountry: text("address_country").notNull().default("Canada"),

  // Location (for maps + nearby services)
  latitude: text("latitude"),
  longitude: text("longitude"),

  // Layout
  floor: text("floor"),
  layout: text("layout"), // "2BR / 2BA"
  beds: jsonb("beds").$type<
    Array<{ type: string; count: number; location: string }>
  >(),
  // e.g. [{type: "queen", count: 1, location: "Primary Bedroom"}, {type: "single", count: 2, location: "Second Bedroom"}, {type: "pullout", count: 1, location: "Living Room"}]

  // Access
  wifiName: text("wifi_name"),
  wifiPassword: text("wifi_password"),
  parkingSpot: text("parking_spot"),
  parkingInstructions: text("parking_instructions"),
  buzzerName: text("buzzer_name"),
  buzzerInstructions: text("buzzer_instructions"),

  // Check-in / Check-out
  checkinTime: text("checkin_time").notNull().default("15:00"),
  checkoutTime: text("checkout_time").notNull().default("11:00"),
  preArrivalLeadMins: integer("pre_arrival_lead_mins").default(30),
  checkinSteps: jsonb("checkin_steps").$type<
    Array<{
      step: number;
      title: string;
      description: string;
      icon?: string;
    }>
  >(),
  checkoutSteps: jsonb("checkout_steps").$type<
    Array<{ step: number; title: string; description: string }>
  >(),

  // Rules & Policies
  houseRules: jsonb("house_rules").$type<
    Array<{ rule: string; icon?: string }>
  >(),
  securityNote: text("security_note"), // "Don't interact with security"
  idRequired: boolean("id_required").default(true),
  idLeadHours: integer("id_lead_hours").default(72),
  thirdPartyAllowed: boolean("third_party_allowed").default(false),

  // Amenities
  kitchenAmenities: jsonb("kitchen_amenities").$type<string[]>(),
  bathroomAmenities: jsonb("bathroom_amenities").$type<string[]>(),
  generalAmenities: jsonb("general_amenities").$type<string[]>(),

  // Nearby Services (displayed on guest guide)
  nearbyServices: jsonb("nearby_services").$type<
    Array<{
      name: string;
      category:
        | "grocery"
        | "restaurant"
        | "pharmacy"
        | "hospital"
        | "transit"
        | "gas"
        | "gym"
        | "park"
        | "entertainment"
        | "other";
      address?: string;
      distance?: string;
      googleMapsUrl?: string;
      phone?: string;
      notes?: string;
    }>
  >(),

  // Emergency / Contact
  emergencyContact: text("emergency_contact"),
  hostPhone: text("host_phone"), // Mariam's phone for this property
  ownerPhone: text("owner_phone"), // Owner's phone (shown on guest guide)

  // Thermostat
  thermostatDefault: text("thermostat_default").default("22°C"),

  // State
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id), // null = global template
  name: text("name").notNull(), // "Pre-Booking Screening"
  triggerDescription: text("trigger_description"), // "When a guest sends a booking inquiry"
  bodyTemplate: text("body_template").notNull(), // Mustache-style: {{property.wifiName}}
  sortOrder: integer("sort_order").default(0),
  isGlobal: boolean("is_global").default(false), // true = default for all properties
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// CHECKLIST TEMPLATES
// ============================================================

export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id), // null = global
  name: text("name").notNull(), // "Standard Turnover"
  sections: jsonb("sections").$type<
    Array<{
      title: string;
      items: Array<{
        label: string;
        type: "check" | "restock" | "deep_clean" | "monthly";
      }>;
    }>
  >(),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// TURNOVERS (completed checklists)
// ============================================================

export const turnovers = pgTable("turnovers", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
    .notNull(),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  checklistData: jsonb("checklist_data"), // Snapshot of checked items
  notes: text("notes"),
  nextGuestCheckin: timestamp("next_guest_checkin"),
  photos: jsonb("photos").$type<string[]>(), // URLs to uploaded photos (future)
});

// ============================================================
// RELATIONS
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const ownersRelations = relations(owners, ({ many, one }) => ({
  properties: many(properties),
  user: one(users, { fields: [owners.userId], references: [users.id] }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(owners, { fields: [properties.ownerId], references: [owners.id] }),
  messageTemplates: many(messageTemplates),
  turnovers: many(turnovers),
}));

export const messageTemplatesRelations = relations(
  messageTemplates,
  ({ one }) => ({
    property: one(properties, {
      fields: [messageTemplates.propertyId],
      references: [properties.id],
    }),
  })
);

export const turnoversRelations = relations(turnovers, ({ one }) => ({
  property: one(properties, {
    fields: [turnovers.propertyId],
    references: [properties.id],
  }),
}));
