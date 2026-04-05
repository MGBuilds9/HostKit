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
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// ── Enums ──────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "owner", "manager", "cleaner"]);
export const stayStatusEnum = pgEnum("stay_status", ["booked", "blocked", "cancelled"]);
export const cleaningTaskStatusEnum = pgEnum("cleaning_task_status", [
  "pending", "offered", "accepted", "in_progress", "completed", "cancelled",
]);
export const calendarSourceEnum = pgEnum("calendar_source", ["airbnb", "google", "manual"]);

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
    userIdIdx: index("accounts_user_id_idx").on(account.userId),
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
// OWNER STATEMENTS
// ============================================================

export const ownerStatements = pgTable("owner_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => owners.id).notNull(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  month: text("month").notNull(), // "2026-04" format
  revenue: integer("revenue").default(0), // in cents
  expenses: integer("expenses").default(0), // in cents
  payout: integer("payout").default(0), // in cents
  status: text("status").default("draft"), // "draft" | "sent" | "paid"
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  ownerIdIdx: index("owner_statements_owner_id_idx").on(table.ownerId),
  propertyIdIdx: index("owner_statements_property_id_idx").on(table.propertyId),
  monthIdx: index("owner_statements_month_idx").on(table.month),
}));

// ============================================================
// OWNER DOCUMENTS
// ============================================================

export const ownerDocuments = pgTable("owner_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(() => owners.id).notNull(),
  type: text("type").notNull(), // "lease" | "tax" | "insurance" | "other"
  name: text("name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => ({
  ownerIdIdx: index("owner_documents_owner_id_idx").on(table.ownerId),
}));

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
      mediaUrl?: string;
      mediaType?: "image" | "video";
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

  // Calendar Sync
  airbnbIcalUrl: text("airbnb_ical_url"),
  googleCalendarId: text("google_calendar_id"),
  icalSyncEnabled: boolean("ical_sync_enabled").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // "ok" | "error"
  lastSyncError: text("last_sync_error"),
  syncIntervalMinutes: integer("sync_interval_minutes").default(15),

  // Turnover Rules
  cleanOn: text("clean_on").default("checkout"), // "checkout" | "checkin" | "both"
  cleanStartOffsetHours: integer("clean_start_offset_hours").default(0),
  cleanDurationHours: integer("clean_duration_hours").default(3),
  defaultCleanerId: uuid("default_cleaner_id"),
  sameDayTurnAllowed: boolean("same_day_turn_allowed").default(false),
  timezone: text("timezone").default("America/Toronto"),

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
}, (table) => ({
  propertyIdIdx: index("message_templates_property_id_idx").on(table.propertyId),
}));

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
}, (table) => ({
  propertyIdIdx: index("checklist_templates_property_id_idx").on(table.propertyId),
}));

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
}, (table) => ({
  propertyIdIdx: index("turnovers_property_id_idx").on(table.propertyId),
  completedAtIdx: index("turnovers_completed_at_idx").on(table.completedAt),
}));

// ============================================================
// CLEANERS
// ============================================================

export const cleaners = pgTable("cleaners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  notificationPreferences: jsonb("notification_preferences").$type<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }>().default({ emailEnabled: true, pushEnabled: true }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// STAYS
// ============================================================

export const stays = pgTable("stays", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
    .notNull(),
  source: calendarSourceEnum("source").default("airbnb"),
  status: stayStatusEnum("status").default("booked"),
  guestName: text("guest_name"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rawSummary: text("raw_summary"),
  rawDescription: text("raw_description"),
  externalUid: text("external_uid"),
  hash: text("hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdIdx: index("stays_property_id_idx").on(table.propertyId),
  externalUidIdx: index("stays_external_uid_idx").on(table.externalUid),
  dateRangeIdx: index("stays_date_range_idx").on(table.startDate, table.endDate),
}));

// ============================================================
// CLEANING TASKS
// ============================================================

export const cleaningTasks = pgTable("cleaning_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
    .notNull(),
  stayId: uuid("stay_id").references(() => stays.id),
  triggerType: text("trigger_type"), // "checkout" | "checkin"
  scheduledStart: timestamp("scheduled_start").notNull(),
  scheduledEnd: timestamp("scheduled_end").notNull(),
  status: cleaningTaskStatusEnum("status").default("pending"),
  assignedCleanerId: uuid("assigned_cleaner_id").references(() => cleaners.id),
  priority: integer("priority").default(0),
  checklistData: jsonb("checklist_data"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  propertyIdIdx: index("cleaning_tasks_property_id_idx").on(table.propertyId),
  assignedCleanerIdIdx: index("cleaning_tasks_assigned_cleaner_id_idx").on(table.assignedCleanerId),
  scheduledStartIdx: index("cleaning_tasks_scheduled_start_idx").on(table.scheduledStart),
  statusIdx: index("cleaning_tasks_status_idx").on(table.status),
}));

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // "task_assigned" | "task_updated" | "task_cancelled" | "task_reminder"
  title: text("title").notNull(),
  body: text("body"),
  linkUrl: text("link_url"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("notifications_user_id_idx").on(table.userId),
  userIdReadIdx: index("notifications_user_id_read_idx").on(table.userId, table.read),
}));

// ============================================================
// PUSH SUBSCRIPTIONS
// ============================================================

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("push_subscriptions_user_id_idx").on(table.userId),
  endpointIdx: index("push_subscriptions_endpoint_idx").on(table.endpoint),
}));

// ============================================================
// APP SETTINGS
// ============================================================

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// SYNC LOG
// ============================================================

export const syncLog = pgTable("sync_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
    .notNull(),
  eventType: text("event_type").notNull(), // "fetch" | "upsert" | "error"
  eventTime: timestamp("event_time").defaultNow().notNull(),
  details: jsonb("details"),
}, (table) => ({
  propertyIdIdx: index("sync_log_property_id_idx").on(table.propertyId),
  eventTimeIdx: index("sync_log_event_time_idx").on(table.eventTime),
}));

// ============================================================
// RELATIONS
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  notifications: many(notifications),
  pushSubscriptions: many(pushSubscriptions),
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
  statements: many(ownerStatements),
  documents: many(ownerDocuments),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(owners, { fields: [properties.ownerId], references: [owners.id] }),
  messageTemplates: many(messageTemplates),
  turnovers: many(turnovers),
  stays: many(stays),
  cleaningTasks: many(cleaningTasks),
  syncLogs: many(syncLog),
  defaultCleaner: one(cleaners, {
    fields: [properties.defaultCleanerId],
    references: [cleaners.id],
  }),
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

export const cleanersRelations = relations(cleaners, ({ one, many }) => ({
  user: one(users, { fields: [cleaners.userId], references: [users.id] }),
  cleaningTasks: many(cleaningTasks),
}));

export const staysRelations = relations(stays, ({ one, many }) => ({
  property: one(properties, {
    fields: [stays.propertyId],
    references: [properties.id],
  }),
  cleaningTasks: many(cleaningTasks),
}));

export const cleaningTasksRelations = relations(cleaningTasks, ({ one }) => ({
  property: one(properties, {
    fields: [cleaningTasks.propertyId],
    references: [properties.id],
  }),
  stay: one(stays, {
    fields: [cleaningTasks.stayId],
    references: [stays.id],
  }),
  assignedCleaner: one(cleaners, {
    fields: [cleaningTasks.assignedCleanerId],
    references: [cleaners.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const syncLogRelations = relations(syncLog, ({ one }) => ({
  property: one(properties, {
    fields: [syncLog.propertyId],
    references: [properties.id],
  }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const ownerStatementsRelations = relations(ownerStatements, ({ one }) => ({
  owner: one(owners, { fields: [ownerStatements.ownerId], references: [owners.id] }),
  property: one(properties, { fields: [ownerStatements.propertyId], references: [properties.id] }),
}));

export const ownerDocumentsRelations = relations(ownerDocuments, ({ one }) => ({
  owner: one(owners, { fields: [ownerDocuments.ownerId], references: [owners.id] }),
}));
