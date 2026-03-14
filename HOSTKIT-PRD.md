# HostKit — Product Requirements Document

## Executive Summary

HostKit is a self-hosted property management toolkit for Airbnb hosts and property managers. It enables a property manager (Mariam) to onboard properties in minutes, generate beautiful guest-facing materials, track turnovers, and manage messaging — across multiple properties owned by multiple owners. Guests receive a premium, mobile-first digital concierge experience via a shareable link/QR code.

**Two users, two experiences:**

| User | Need | Experience |
|------|------|-----------|
| **Mariam (Property Manager)** | Manage 10+ properties across multiple owners. Onboard new properties fast. Generate guest materials. Track turnovers. | Clean admin dashboard. Form-based property onboarding. One-click message generation. Interactive checklists. |
| **Guest** | Check in smoothly. Find WiFi, parking, amenities, nearby services. Feel like this is the best Airbnb they've ever stayed at. | Mobile-first digital concierge. Swipeable check-in walkthrough. Copy-to-clipboard WiFi. Interactive map. Nearby services directory. Beautiful, app-like feel. |

**Owners** get a read-only portal to view their properties, guest guides, and turnover history.

---

## Tech Stack

| Layer | Choice | Justification |
|-------|--------|---------------|
| Database | PostgreSQL 16 (Docker) | Lightweight, proven, direct connection |
| ORM | Drizzle ORM | Type-safe, lightweight, no SDK bloat |
| Framework | Next.js 14 (App Router) | SSR guest guides, API routes, admin |
| Auth | NextAuth.js v5 | Google OAuth + credentials, role-based |
| Styling | Tailwind CSS 3.4 + shadcn/ui | Clean admin, beautiful guest pages |
| Animations | Framer Motion | Swipeable walkthroughs, page transitions |
| Icons | Lucide React | Consistent, tree-shakeable |
| QR Codes | `qrcode` npm package | Server-side QR generation |
| Maps | Google Maps Embed (free) or Leaflet | Parking/unit location maps |
| Deployment | Docker Compose (self-hosted) | Two containers: PG + Next.js |
| Reverse Proxy | Nginx Proxy Manager (existing) | hostkit.mkgbuilds.com |

---

## Infrastructure

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: hostkit
      POSTGRES_USER: hostkit
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - hostkit_pgdata:/var/lib/postgresql/data
    networks:
      - hostkit
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hostkit"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://hostkit:${DB_PASSWORD}@db:5432/hostkit
      NEXTAUTH_URL: https://hostkit.mkgbuilds.com
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    ports:
      - "3100:3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - hostkit

volumes:
  hostkit_pgdata:

networks:
  hostkit:
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### Environment Variables (.env)

```env
DB_PASSWORD=<generate-strong-password>
DATABASE_URL=postgresql://hostkit:${DB_PASSWORD}@db:5432/hostkit
NEXTAUTH_URL=https://hostkit.mkgbuilds.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
GOOGLE_MAPS_API_KEY=<optional-for-embed-maps>
```

### NPM Proxy Config

- Source: `hostkit-app:3100`
- Domain: `hostkit.mkgbuilds.com`
- SSL: Let's Encrypt
- Websocket support: enabled

---

## Database Schema (Drizzle ORM)

### File: `src/db/schema.ts`

```typescript
import { pgTable, uuid, text, boolean, integer, time, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

export const userRoleEnum = pgEnum("user_role", ["admin", "owner", "manager"]);

// ============================================================
// USERS (NextAuth-managed + role)
// ============================================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("owner"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  ownerId: uuid("owner_id").references(() => owners.id).notNull(),

  // Identity
  name: text("name").notNull(),                    // "Kith 1423"
  slug: text("slug").notNull().unique(),            // "kith-1423"
  description: text("description"),                 // Short tagline for guest guide hero

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
  layout: text("layout"),                           // "2BR / 2BA"
  beds: jsonb("beds").$type<Array<{type: string; count: number; location: string}>>(),
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
  checkinSteps: jsonb("checkin_steps").$type<Array<{step: number; title: string; description: string; icon?: string}>>(),
  checkoutSteps: jsonb("checkout_steps").$type<Array<{step: number; title: string; description: string}>>(),

  // Rules & Policies
  houseRules: jsonb("house_rules").$type<Array<{rule: string; icon?: string}>>(),
  securityNote: text("security_note"),              // "Don't interact with security"
  idRequired: boolean("id_required").default(true),
  idLeadHours: integer("id_lead_hours").default(72),
  thirdPartyAllowed: boolean("third_party_allowed").default(false),

  // Amenities
  kitchenAmenities: jsonb("kitchen_amenities").$type<string[]>(),
  bathroomAmenities: jsonb("bathroom_amenities").$type<string[]>(),
  generalAmenities: jsonb("general_amenities").$type<string[]>(),

  // Nearby Services (displayed on guest guide)
  nearbyServices: jsonb("nearby_services").$type<Array<{
    name: string;
    category: "grocery" | "restaurant" | "pharmacy" | "hospital" | "transit" | "gas" | "gym" | "park" | "entertainment" | "other";
    address?: string;
    distance?: string;
    googleMapsUrl?: string;
    phone?: string;
    notes?: string;
  }>>(),

  // Emergency / Contact
  emergencyContact: text("emergency_contact"),
  hostPhone: text("host_phone"),                    // Mariam's phone for this property
  ownerPhone: text("owner_phone"),                  // Owner's phone (shown on guest guide)

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
  propertyId: uuid("property_id").references(() => properties.id),  // null = global template
  name: text("name").notNull(),                     // "Pre-Booking Screening"
  triggerDescription: text("trigger_description"),   // "When a guest sends a booking inquiry"
  bodyTemplate: text("body_template").notNull(),     // Mustache-style: {{property.wifiName}}
  sortOrder: integer("sort_order").default(0),
  isGlobal: boolean("is_global").default(false),     // true = default for all properties
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// CHECKLIST TEMPLATES
// ============================================================

export const checklistTemplates = pgTable("checklist_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id),  // null = global
  name: text("name").notNull(),                     // "Standard Turnover"
  sections: jsonb("sections").$type<Array<{
    title: string;
    items: Array<{
      label: string;
      type: "check" | "restock" | "deep_clean" | "monthly";
    }>;
  }>>(),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// TURNOVERS (completed checklists)
// ============================================================

export const turnovers = pgTable("turnovers", {
  id: uuid("id").primaryKey().defaultRandom(),
  propertyId: uuid("property_id").references(() => properties.id).notNull(),
  completedBy: text("completed_by"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  checklistData: jsonb("checklist_data"),            // Snapshot of checked items
  notes: text("notes"),
  nextGuestCheckin: timestamp("next_guest_checkin"),
  photos: jsonb("photos").$type<string[]>(),         // URLs to uploaded photos (future)
});

// ============================================================
// RELATIONS
// ============================================================

export const ownersRelations = relations(owners, ({ many, one }) => ({
  properties: many(properties),
  user: one(users, { fields: [owners.userId], references: [users.id] }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  owner: one(owners, { fields: [properties.ownerId], references: [owners.id] }),
  messageTemplates: many(messageTemplates),
  turnovers: many(turnovers),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  property: one(properties, { fields: [messageTemplates.propertyId], references: [properties.id] }),
}));

export const turnoversRelations = relations(turnovers, ({ one }) => ({
  property: one(properties, { fields: [turnovers.propertyId], references: [properties.id] }),
}));
```

---

## Route Architecture

### File Structure

```
src/
├── app/
│   ├── layout.tsx                          # Root layout (fonts, theme)
│   ├── page.tsx                            # Landing redirect → /admin or /g
│   │
│   ├── (auth)/
│   │   ├── login/page.tsx                  # Login page (Google OAuth)
│   │   └── layout.tsx                      # Auth layout (centered card)
│   │
│   ├── (admin)/                            # Protected — manager + owner
│   │   ├── layout.tsx                      # Sidebar + topbar layout
│   │   ├── admin/
│   │   │   ├── page.tsx                    # Dashboard (property overview cards)
│   │   │   ├── properties/
│   │   │   │   ├── page.tsx                # Property list (grid of cards)
│   │   │   │   ├── new/page.tsx            # Multi-step property creation form
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx            # Property detail view
│   │   │   │       ├── edit/page.tsx       # Edit property
│   │   │   │       ├── messages/page.tsx   # Message generator for this property
│   │   │   │       ├── checklist/page.tsx  # Interactive turnover checklist
│   │   │   │       ├── turnovers/page.tsx  # Turnover history log
│   │   │   │       └── guide/page.tsx      # Guest guide preview + QR code
│   │   │   │
│   │   │   ├── owners/
│   │   │   │   ├── page.tsx                # Owner list (admin/manager only)
│   │   │   │   └── new/page.tsx            # Add owner
│   │   │   │
│   │   │   ├── templates/
│   │   │   │   ├── page.tsx                # Global message template editor
│   │   │   │   └── checklist/page.tsx      # Global checklist template editor
│   │   │   │
│   │   │   └── settings/
│   │   │       └── page.tsx                # User management, prefs
│   │
│   ├── g/                                  # PUBLIC — no auth required
│   │   └── [slug]/
│   │       ├── page.tsx                    # Guest guide (SSR, mobile-first)
│   │       └── opengraph-image.tsx         # OG image generation
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts     # NextAuth handler
│       ├── properties/route.ts             # CRUD
│       ├── properties/[id]/route.ts
│       ├── properties/[id]/messages/route.ts
│       ├── properties/[id]/turnovers/route.ts
│       ├── owners/route.ts
│       ├── templates/route.ts
│       └── qr/[slug]/route.ts             # QR code image generation
│
├── components/
│   ├── ui/                                 # shadcn/ui components
│   ├── admin/
│   │   ├── sidebar.tsx
│   │   ├── property-card.tsx
│   │   ├── property-form/                  # Multi-step form components
│   │   │   ├── step-basics.tsx
│   │   │   ├── step-access.tsx
│   │   │   ├── step-amenities.tsx
│   │   │   └── step-review.tsx
│   │   ├── message-generator.tsx
│   │   ├── turnover-checklist.tsx
│   │   └── owner-card.tsx
│   │
│   └── guest/
│       ├── guide-layout.tsx                # Guest guide shell (mobile-first)
│       ├── hero-section.tsx                # Property name + welcome
│       ├── checkin-walkthrough.tsx          # Swipeable step-by-step
│       ├── wifi-card.tsx                   # Tap-to-copy WiFi block
│       ├── parking-card.tsx
│       ├── amenities-section.tsx           # Accordion sections
│       ├── house-rules-section.tsx
│       ├── nearby-services.tsx             # Categorized directory with map links
│       ├── emergency-contacts.tsx          # Clickable phone numbers
│       ├── checkout-section.tsx
│       └── qr-badge.tsx                    # Floating QR code component
│
├── db/
│   ├── index.ts                            # Drizzle client
│   ├── schema.ts                           # Schema (above)
│   └── seed.ts                             # Seed Kith 1423 data
│
├── lib/
│   ├── auth.ts                             # NextAuth config
│   ├── template-engine.ts                  # Mustache-style template renderer
│   └── utils.ts                            # Shared utilities
│
└── styles/
    └── globals.css                          # Tailwind + CSS variables
```

---

## Auth & Roles

### NextAuth Configuration

```
Provider: Google OAuth
Adapter: Drizzle (PostgreSQL)

Roles:
  admin    → Full access (Mariam, MG)
  manager  → Same as admin (future-proofing for additional managers)
  owner    → Read-only: view their own properties, guest guides, turnover history

Route protection:
  /admin/*     → admin, manager, owner (owner sees filtered view)
  /g/*         → Public (no auth)
  /api/*       → Protected by role (except /api/qr/*)
```

### First-Time Setup

On first launch, if no users exist, the first Google login is auto-assigned `admin` role. All subsequent users default to `owner`. Admins can promote users to `manager`.

---

## Guest Guide — Design Specification

### URL: `hostkit.mkgbuilds.com/g/[slug]`

### Design Direction: Modern & Minimal

**Core Aesthetic:**
- Clean white background with subtle warm gray sections
- Generous whitespace, card-based layout
- Typography: `DM Sans` (headings) + `Inter` (body) — both from Google Fonts
- Accent color: Warm coral (#FF6B6B) for CTAs and interactive elements
- Subtle animations: fade-in on scroll, smooth accordion open/close
- Mobile-first: designed for phone screens, gracefully scales up
- No navbar/footer clutter — immersive, app-like feel
- Sticky bottom bar with emergency contact + call button

**Layout (top to bottom on mobile):**

```
┌─────────────────────────────┐
│         HERO SECTION         │
│  ┌───────────────────────┐  │
│  │   Welcome to          │  │
│  │   Kith 1423           │  │
│  │   ─────────────────   │  │
│  │   Your home away      │  │
│  │   from home in        │  │
│  │   Mississauga         │  │
│  └───────────────────────┘  │
│                              │
│  ┌─ CHECK-IN WALKTHROUGH ─┐ │
│  │  Swipeable cards        │ │
│  │  Step 1 of 6 ● ○ ○ ○   │ │
│  │  [Park in visitor       │ │
│  │   parking]              │ │
│  │           ← swipe →     │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── WIFI ─────────────────┐ │
│  │  📶 MG-1423             │ │
│  │  🔑 Welcome123!/@       │ │
│  │       [Copy Password]   │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── PARKING ──────────────┐ │
│  │  🅿️ Spot P3-257         │ │
│  │  Instructions...         │ │
│  │  [Open in Maps]         │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── HOUSE RULES ──────────┐ │
│  │  🚭 No smoking          │ │
│  │  🐾 No pets             │ │
│  │  🎉 No parties          │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── KITCHEN ──────────────┐ │
│  │  ▸ Tap to expand        │ │
│  │  (accordion)            │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── BATHROOMS ────────────┐ │
│  │  ▸ Tap to expand        │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── BEDROOMS ─────────────┐ │
│  │  ▸ Tap to expand        │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── LAUNDRY ──────────────┐ │
│  │  ▸ Tap to expand        │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── NEARBY ───────────────┐ │
│  │  Category tabs:          │ │
│  │  [🛒 Grocery] [🍕 Food] │ │
│  │  [💊 Pharmacy] [🏥 ER]  │ │
│  │                          │ │
│  │  Fortinos — 0.3 km      │ │
│  │  [Directions] [Call]     │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── CHECKOUT ─────────────┐ │
│  │  Checklist style         │ │
│  │  ☐ Towels in tub        │ │
│  │  ☐ Start dishwasher     │ │
│  │  ☐ Lights off           │ │
│  └─────────────────────────┘ │
│                              │
│  ┌── EMERGENCY ────────────┐ │
│  │  🚨 911                  │ │
│  │  📞 Mariam: xxx-xxxx     │ │
│  │  📞 Owner: xxx-xxxx      │ │
│  └─────────────────────────┘ │
│                              │
│ ┌────────────────────────────┐│
│ │ STICKY BOTTOM BAR          ││
│ │ [📞 Call Host]  [🆘 SOS]  ││
│ └────────────────────────────┘│
└─────────────────────────────┘
```

### Interactive Features

1. **Check-In Walkthrough** — Framer Motion swipeable carousel. Each step is a card with icon, title, description. Progress dots at bottom. Guests can swipe through or tap next/prev.

2. **WiFi Copy-to-Clipboard** — Tap the password or the "Copy" button. Shows a brief "Copied!" toast. Auto-connects QR code if device supports it (Wi-Fi QR format: `WIFI:T:WPA;S:{ssid};P:{password};;`).

3. **Nearby Services** — Categorized tabs (Grocery, Food, Pharmacy, Hospital, Transit, etc.). Each entry shows name, distance, and buttons: "Directions" (opens Google Maps) and "Call" (tel: link).

4. **Emergency Contacts** — Clickable phone numbers using `tel:` links. 911 at top, then host (Mariam), then owner.

5. **Parking Map** — Embedded Google Maps link or static map showing building location. Optional: annotated image of garage layout (upload per property).

6. **QR Code** — Available on admin side for printing. Encodes the guest guide URL. Also generates a WiFi QR code.

---

## Admin Dashboard — Design Specification

### Design Direction

- **shadcn/ui** components throughout (consistent, professional)
- Light theme with neutral grays
- Responsive: works on tablet (Mariam) and desktop (MG)
- Left sidebar navigation, collapsible on mobile

### Dashboard (Home)

- Grid of property cards showing: name, address, owner, status badge (active/inactive), next guest date, quick actions (view guide, generate messages, start turnover)
- Summary stats: total properties, turnovers this month, upcoming check-ins

### Property Creation — Multi-Step Form

```
Step 1: Basics
  - Property name, slug (auto-generated from name)
  - Owner (dropdown, or create new)
  - Address fields
  - Floor, layout (text)
  - Beds (dynamic: add bed type + count + location)

Step 2: Access & Check-In
  - WiFi name + password
  - Parking spot + instructions (textarea)
  - Buzzer name + instructions
  - Check-in time, checkout time
  - Pre-arrival lead time (minutes)
  - Check-in steps (dynamic: add/reorder/remove steps with title + description)
  - Checkout steps (dynamic)
  - Security note (textarea)

Step 3: Amenities & Rules
  - Kitchen amenities (tag picker — presets + custom)
  - Bathroom amenities (tag picker)
  - General amenities (tag picker)
  - House rules (dynamic list with optional icon picker)
  - ID required? (toggle) + lead hours
  - Third-party reservations allowed? (toggle)

Step 4: Nearby & Emergency
  - Nearby services (dynamic: name, category dropdown, address, distance, Google Maps URL, phone, notes)
  - Emergency contact
  - Host phone (Mariam)
  - Owner phone
  - Thermostat default

Step 5: Review
  - Summary of all fields
  - Live preview of guest guide (side panel on desktop, below on mobile)
  - [Save as Draft] [Save & Publish]
```

### Message Generator

- Select property from dropdown
- Shows all 7 templates with property data pre-filled
- Each template has: trigger label, pre-filled message, [Copy] button
- Templates use Mustache-style variables: `{{property.wifiName}}`, `{{property.addressStreet}}`, `{{owner.name}}`, etc.
- "Edit Template" link to modify the template text

### Turnover Checklist

- Select property → loads checklist template with all sections
- Interactive checkboxes, grouped by room/area
- Deep clean items shown separately (toggle to include)
- Notes field at bottom
- "Mark Complete" saves to `turnovers` table with timestamp
- History tab shows past turnovers with dates and who completed them

---

## Message Template Engine

### Variable Syntax

Templates use `{{variable}}` syntax. The engine replaces variables with property data at render time.

### Available Variables

```
{{guestName}}              — Replaced manually or via Airbnb shortcode
{{property.name}}          — "Kith 1423"
{{property.addressFull}}   — "2485 Eglinton Ave W, Unit 1423, Mississauga, ON L5M 2V8"
{{property.addressStreet}} — "2485 Eglinton Ave W"
{{property.addressUnit}}   — "1423"
{{property.addressCity}}   — "Mississauga"
{{property.floor}}         — "14th"
{{property.wifiName}}      — "MG-1423"
{{property.wifiPassword}}  — "Welcome123!/@"
{{property.parkingSpot}}   — "P3-257"
{{property.checkinTime}}   — "3:00 PM"
{{property.checkoutTime}}  — "11:00 AM"
{{property.buzzerName}}    — "George A."
{{property.thermostat}}    — "22°C"
{{property.hostPhone}}     — Mariam's phone
{{property.ownerPhone}}    — Owner's phone
{{property.guideUrl}}      — "https://hostkit.mkgbuilds.com/g/kith-1423"
{{property.idLeadHours}}   — "72"
{{owner.name}}             — Owner's name
{{checkinDate}}            — Manual / Airbnb shortcode
{{checkoutDate}}           — Manual / Airbnb shortcode
```

---

## Default Message Templates (Global — 7 Templates)

Seed these as `isGlobal: true` in the database. See the message-templates.md file generated earlier for full template text. Each template body uses the `{{variable}}` syntax above.

---

## Seed Data: Kith 1423

```typescript
// src/db/seed.ts — seed Kith 1423 as the first property

const kith1423 = {
  name: "Kith 1423",
  slug: "kith-1423",
  description: "Your home away from home in Mississauga",

  addressStreet: "2485 Eglinton Avenue West",
  addressUnit: "1423",
  addressCity: "Mississauga",
  addressProvince: "ON",
  addressPostal: "L5M 2V8",
  addressCountry: "Canada",
  latitude: "43.5465",
  longitude: "-79.6603",

  floor: "14th",
  layout: "2BR / 2BA",
  beds: [
    { type: "Queen", count: 1, location: "Primary Bedroom" },
    { type: "Single", count: 2, location: "Second Bedroom" },
    { type: "Pull-out Sofa", count: 1, location: "Living Room" },
  ],

  wifiName: "MG-1423",
  wifiPassword: "Welcome123!/@",
  parkingSpot: "P3-257",
  parkingInstructions: "Resident parking is accessed through the yellow gate near the visitor parking entrance. You may need to use the fob to open the garage door. Your spot number (P3-257) is clearly marked on the wall.",
  buzzerName: "George A.",
  buzzerInstructions: 'At the building entrance buzzer/intercom, select "George A." from the directory. The door will be unlocked for you.',

  checkinTime: "15:00",
  checkoutTime: "11:00",
  preArrivalLeadMins: 30,

  checkinSteps: [
    { step: 1, title: "Park in Visitor Parking", description: "As you enter the underground garage, follow the signs to visitor parking. Park in any available visitor spot.", icon: "car" },
    { step: 2, title: "One Person Goes Up", description: "Only the reservation holder should go to the unit first — no luggage yet. This is required for key handoff.", icon: "user" },
    { step: 3, title: "Enter the Building", description: 'At the buzzer, select "George A." from the directory. The door will unlock automatically.', icon: "door-open" },
    { step: 4, title: "Go to Unit 1423", description: "Take the elevator to the 14th floor. Your keys and fob will be on the kitchen counter inside the unit.", icon: "key" },
    { step: 5, title: "Move Your Car", description: "Return to the garage. Instead of going right to visitor parking, take the yellow gate to resident parking. Your spot is P3-257. You may need the fob for the garage door.", icon: "square-parking" },
    { step: 6, title: "Unload & Settle In", description: "Bring up your luggage. Use the fob to access the door between the parking garage and the elevator. Welcome home!", icon: "luggage" },
  ],

  checkoutSteps: [
    { step: 1, title: "Gather Towels", description: "Place all used towels in the bathtub or on the bathroom floor." },
    { step: 2, title: "Dishes", description: "Load and start the dishwasher, or hand wash any dishes you used." },
    { step: 3, title: "Garbage", description: "Take out any personal garbage to the garbage room on your floor." },
    { step: 4, title: "Lights & Appliances", description: "Turn off all lights, TV, and appliances." },
    { step: 5, title: "Windows", description: "Close all windows." },
    { step: 6, title: "Keys", description: "Leave keys and fob on the kitchen counter. Lock the door behind you." },
    { step: 7, title: "Thermostat", description: "Set thermostat to 22°C." },
  ],

  houseRules: [
    { rule: "No smoking — strictly prohibited", icon: "cigarette-off" },
    { rule: "No pets allowed", icon: "paw-print" },
    { rule: "No parties or events", icon: "party-popper" },
    { rule: "Quiet hours after 10 PM", icon: "moon" },
    { rule: "Do not contact building security or concierge", icon: "shield-alert" },
  ],

  securityNote: "Building security and concierge do not service short-term rentals. Please do not interact with them. For any questions or issues, contact your host directly.",
  idRequired: true,
  idLeadHours: 72,
  thirdPartyAllowed: false,

  kitchenAmenities: [
    "Coffee machine", "Kettle", "Toaster", "Dishwasher", "Pots & pans",
    "Baking tray", "Full cutlery set", "Cutting board", "Strainer", "Peeler",
    "Grater", "Tongs", "Wine glasses", "Measuring cups", "Mixing bowl",
    "Oven mitts", "Dish soap", "Sponge", "Dishwasher pods",
    "Coffee, tea, sugar, salt & pepper provided",
  ],

  bathroomAmenities: [
    "Shampoo", "Conditioner", "Body wash", "Hand soap",
    "Hair dryer", "Bidet", "First aid kit",
    "Fresh towels (body & face)", "Toilet paper",
  ],

  generalAmenities: [
    "In-unit laundry (pods & dryer sheets provided)",
    "Iron & ironing board", "Desk & office chair",
    "Fire extinguisher", "Candy welcome jars",
    "Extra bedding in closet", "Hangers in every closet",
  ],

  nearbyServices: [
    { name: "Fortinos", category: "grocery", distance: "350m", googleMapsUrl: "https://maps.google.com/?q=Fortinos+Eglinton+Mississauga", phone: "+19058286886" },
    { name: "Shoppers Drug Mart", category: "pharmacy", distance: "400m", googleMapsUrl: "https://maps.google.com/?q=Shoppers+Drug+Mart+Eglinton+Mississauga", phone: "+19058286677" },
    { name: "Trillium Health Partners (Credit Valley)", category: "hospital", distance: "3.5km", googleMapsUrl: "https://maps.google.com/?q=Credit+Valley+Hospital", phone: "+19058131100", notes: "Nearest ER" },
    { name: "MiWay Transit", category: "transit", notes: "Bus stops on Eglinton Ave — routes 19 and 101" },
    { name: "Erin Mills Town Centre", category: "entertainment", distance: "2km", googleMapsUrl: "https://maps.google.com/?q=Erin+Mills+Town+Centre" },
  ],

  emergencyContact: "911",
  hostPhone: "[MARIAM_PHONE]",
  ownerPhone: "[MG_PHONE]",
  thermostatDefault: "22°C",
  active: true,
};
```

---

## QR Code Generation

### API Route: `/api/qr/[slug]`

Generates a PNG QR code encoding the guest guide URL.

```
GET /api/qr/kith-1423
→ Returns PNG image of QR code for https://hostkit.mkgbuilds.com/g/kith-1423

GET /api/qr/kith-1423?type=wifi
→ Returns PNG of WiFi QR code: WIFI:T:WPA;S:MG-1423;P:Welcome123!/@;;
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.2",
    "react": "^18.3",
    "react-dom": "^18.3",
    "next-auth": "^5.0.0-beta",
    "@auth/drizzle-adapter": "^1.0",
    "drizzle-orm": "^0.30",
    "postgres": "^3.4",
    "tailwindcss": "^3.4",
    "@radix-ui/react-accordion": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-tabs": "latest",
    "@radix-ui/react-toast": "latest",
    "framer-motion": "^11",
    "lucide-react": "^0.383",
    "qrcode": "^1.5",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "zod": "^3.23"
  },
  "devDependencies": {
    "drizzle-kit": "^0.21",
    "typescript": "^5.4",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/qrcode": "^1.5",
    "eslint": "^8",
    "eslint-config-next": "^14.2"
  }
}
```

---

## Build Priority & Milestones

### Phase 1 — Foundation (Do First)
- [ ] Project scaffolding (Next.js + Tailwind + shadcn/ui)
- [ ] Docker Compose + Dockerfile
- [ ] Drizzle schema + migrations
- [ ] NextAuth configuration (Google OAuth)
- [ ] Seed Kith 1423 data
- [ ] Basic admin layout (sidebar, auth protection)

### Phase 2 — Guest Guide (High Impact)
- [ ] `/g/[slug]` page — full guest guide with all sections
- [ ] Check-in walkthrough (swipeable)
- [ ] WiFi copy-to-clipboard + WiFi QR code
- [ ] Nearby services directory
- [ ] Emergency contacts with clickable phone numbers
- [ ] Sticky bottom bar
- [ ] QR code generation API
- [ ] OG image generation for link previews

### Phase 3 — Admin CRUD
- [ ] Property list (grid of cards)
- [ ] Multi-step property creation form
- [ ] Property edit
- [ ] Owner management (CRUD)
- [ ] Role-based access (owner sees only their properties)

### Phase 4 — Messages & Turnovers
- [ ] Message template engine
- [ ] Message generator UI (select property → see pre-filled templates → copy)
- [ ] Global + per-property template management
- [ ] Interactive turnover checklist
- [ ] Turnover history log

### Phase 5 — Polish & Automation (Future)
- [ ] n8n webhook endpoints for turnover notifications
- [ ] Guest guide analytics (basic page view counter)
- [ ] Image upload for property photos
- [ ] Print-friendly checklist view
- [ ] Multi-language guest guide support

---

## Key Design Decisions & Rationale

1. **Drizzle over Prisma** — Lighter, faster, SQL-closer. No heavy client generation.
2. **NextAuth v5 over custom auth** — Google OAuth for easy onboarding. Mariam logs in with her Google account.
3. **No Supabase** — Two Docker containers vs 15. Direct PG connection is faster on LAN.
4. **Mustache-style templates over JSX** — Message templates are plain text (for Airbnb/WhatsApp). Simple string replacement, no React rendering needed.
5. **jsonb columns for flexible data** — Beds, amenities, checkin steps, nearby services all vary per property. jsonb avoids join-heavy normalized tables for data that's always read/written as a whole.
6. **Slug-based public URLs** — Clean, memorable, shareable: `/g/kith-1423` not `/g/5f960eb5-667b-34a4-aadb-3cee323e4aa8`.
7. **SSR for guest guides** — No client-side fetching for the critical public page. Fast first paint, good SEO/OG tags.

---

## Notes for Claude Code

- Use `pnpm` as the package manager
- Use Next.js App Router (not Pages Router)
- Use server components by default; add `"use client"` only where interactivity is needed
- Use shadcn/ui CLI to add components: `npx shadcn-ui@latest add button card input ...`
- Use Drizzle Kit for migrations: `pnpm drizzle-kit push`
- All API routes should validate input with Zod
- All admin routes should check session and role via NextAuth middleware
- The guest guide page (`/g/[slug]`) must be SSR with dynamic metadata for OG tags
- Mobile-first: design for 375px width, scale up
- Use CSS variables for the guest guide theme so it can be customized per-property in the future
