# HostKit — Technical Architecture Blueprint v2

> Generated: 2026-03-26
> Supersedes: 2026-03-14-hostkit-blueprint.md
> Source: Codebase audit + e2e trace of production code

---

## Part 0: Classification & Current State

**Project Type:** Web App / SaaS (Self-Hosted)
**Design Archetype:** Three-portal system: Admin Dashboard (PM) + Owner Portal (read-only) + Cleaner Portal (task management) + Public Guest Guide (concierge)

**Deployment Target:** Coolify on Proxmox (.19) via Docker Compose
**Domain:** hostkit.mkgbuilds.com
**Status:** Pre-production — all features built, preparing for first real user testing

| Fact | Detail |
|------|--------|
| Test users | Mariam (admin/PM), David (owner) |
| Properties | 10+ across multiple owners |
| Monthly cost | $0 (fully self-hosted) |
| Package manager | pnpm |
| Default branch | `master` |

---

## Part 1: Tech Stack

| Layer | Package | Version |
|-------|---------|---------|
| Framework | Next.js (App Router) | 14.2.35 |
| Runtime | Node.js | 20 (Docker Alpine) |
| Database | PostgreSQL | 16 (Alpine) |
| ORM | Drizzle ORM | 0.45.1 |
| Auth | NextAuth.js v5 (beta) | 5.0.0-beta.30 |
| UI Components | shadcn/ui + Radix UI | 18 components installed |
| Styling | Tailwind CSS | 3.4.19 |
| Animations | Framer Motion | 12.36.0 |
| Icons | Lucide React | 0.577.0 |
| Forms | react-hook-form + @hookform/resolvers | 7.71.2 / 5.2.2 |
| Validation | Zod | 4.3.6 |
| QR Codes | qrcode | 1.5.4 |
| Calendar Parsing | node-ical | 0.25.6 |
| Email | Resend | 6.9.3 |
| Object Storage | @aws-sdk/client-s3 + s3-request-presigner | 3.1009.0 |
| Testing | Vitest | 4.1.0 |
| Containerization | Docker (multi-stage) | Alpine base |

---

## Part 2: User Roles & Access Control

### Role Hierarchy

| Role | Access | Scope |
|------|--------|-------|
| `admin` | Full system access, user management, all properties | Global |
| `manager` | All properties, owners, cleaners, templates | Global |
| `owner` | Read-only access to own properties via dual-key lookup (`userId` OR `email`) | Scoped |
| `cleaner` | Dedicated portal: assigned tasks, upcoming schedule, profile | Scoped |

### Auth Flow

```
Google OAuth → NextAuth v5 → DrizzleAdapter → PostgreSQL
                    │
                    ├─ First user auto-promoted to "admin" (auth.ts:29-36)
                    ├─ Subsequent users: no default role (must be assigned by admin)
                    │
                    ├─ Middleware (cookie check only — no role validation at edge)
                    │   Protects: /admin/*, /cleaner/*
                    │   Reason: Edge Runtime incompatible with Drizzle postgres driver
                    │
                    └─ Server Components: requireAuth(allowedRoles?)
                        Real role enforcement happens here
```

### Role Assignment

Admin manages roles at: `/admin/settings/users`
- API: `PATCH /api/users/[id]/role` (admin-only, cannot self-demote)
- Owner linking: `/admin/owners/new` — optional `userId` select connects owner record to user account

---

## Part 3: Information Architecture

### Route Map

```
/
├── (auth)/
│   └── login/                             # Google OAuth button
│
├── (admin)/                               # Protected — cookie check in middleware
│   └── admin/
│       ├── /                              # Dashboard — stats + recent activity
│       ├── calendar/                      # Multi-property calendar (stays + tasks)
│       ├── cleaning-tasks/                # All cleaning tasks across properties
│       ├── messages/                      # Aggregate message generator (all properties)
│       ├── turnovers/                     # Aggregate turnover history
│       ├── properties/
│       │   ├── /                          # Property grid (owner-scoped for owner role)
│       │   ├── new/                       # Multi-step creation form (5 steps)
│       │   └── [id]/
│       │       ├── /                      # Property detail
│       │       ├── edit/                  # Edit property (PUT, not PATCH)
│       │       ├── calendar/              # Single-property calendar view
│       │       ├── messages/              # Message generator for this property
│       │       ├── checklist/             # Interactive turnover checklist
│       │       ├── turnovers/             # Turnover history for this property
│       │       ├── guide/                 # Guest guide preview + print + QR
│       │       └── settings/              # iCal sync settings
│       ├── owners/
│       │   ├── /                          # Owner list (admin/manager only)
│       │   └── new/                       # Add owner + optional user linking
│       ├── cleaners/
│       │   ├── /                          # Cleaner list with task counts
│       │   └── [id]/                      # Cleaner detail + history
│       ├── templates/
│       │   ├── /                          # Message template list (read-only)
│       │   └── checklist/                 # Checklist template list (read-only)
│       └── settings/
│           ├── /                          # Current user info + placeholder
│           └── users/                     # User management (admin-only)
│
├── (cleaner)/                             # Protected — cookie check in middleware
│   └── cleaner/
│       ├── /                              # Dashboard — today's + upcoming tasks
│       ├── profile/                       # Cleaner profile view
│       ├── upcoming/                      # Extended upcoming schedule
│       └── tasks/[id]/                    # Task detail + checklist
│
├── g/                                     # PUBLIC — no auth
│   └── [slug]/                            # Guest guide (SSR, cached, mobile-first)
│
└── api/
    ├── auth/[...nextauth]/                # NextAuth handler
    ├── health/                            # Health check (DB ping) — new
    ├── calendar/                          # Calendar data (role-scoped)
    ├── cleaners/                          # CRUD (admin/manager)
    │   └── [id]/                          # Single cleaner ops
    ├── cleaning-tasks/[id]/               # Status updates (role-aware)
    ├── cron/sync-calendars/               # iCal sync (CRON_SECRET auth)
    ├── notifications/                     # GET user notifications
    │   └── [id]/read/                     # Mark as read
    ├── owners/                            # CRUD (admin/manager)
    ├── properties/                        # CRUD (role-scoped)
    │   └── [id]/
    │       ├── /                          # GET/PUT/DELETE
    │       ├── checklist/                 # GET checklist template (with fallback)
    │       ├── cleaning-tasks/            # GET tasks for property
    │       ├── ical-settings/             # GET/PUT iCal config
    │       ├── messages/                  # GET generated messages
    │       ├── stays/                     # GET stays for property
    │       ├── sync/                      # POST manual iCal sync trigger
    │       └── turnovers/                 # GET/POST turnovers
    ├── qr/[slug]/                         # QR code PNG (public, cached 24h)
    ├── templates/                         # (MISSING — templates only via seed)
    ├── upload/                            # Presigned S3 upload URL
    └── users/[id]/role/                   # PATCH role (admin-only) — new
```

### Navigation Structure

**Admin Sidebar (3 groups):**
- Main: Dashboard, Properties, Calendar
- Tools: Cleaning Tasks, Turnovers, Messages
- Settings: Owners, Cleaners, Templates, Users, Settings

**Cleaner Portal:** Bottom tab navigation (Dashboard, Upcoming, Profile)

**Guest Guide:** No navigation — immersive single-page scroll with sticky bottom bar (Call Host + SOS)

---

## Part 4: Data Layer

### Database Schema (13 tables)

```
users ──────────┬──→ accounts (cascade delete)
                ├──→ sessions (cascade delete)
                ├──→ notifications
                └──← owners.userId (nullable)
                     └──→ properties ──┬──→ messageTemplates (nullable = global)
                                       ├──→ checklistTemplates (nullable = global)
                                       ├──→ turnovers
                                       ├──→ stays ──→ cleaningTasks
                                       ├──→ cleaningTasks (direct)
                                       ├──→ syncLog
                                       └──← cleaners.defaultCleanerId (nullable)

cleaners ──← users.userId (nullable)
cleaningTasks ──← cleaners.assignedCleanerId (nullable)

verificationTokens (standalone, compound PK)
```

### jsonb Column Structures

| Table.Column | Structure | Typed? |
|-------------|-----------|--------|
| `properties.beds` | `Array<{type, count, location}>` | Yes (`$type<>`) |
| `properties.checkinSteps` | `Array<{step, title, description, icon?, mediaUrl?, mediaType?}>` | Yes |
| `properties.checkoutSteps` | `Array<{step, title, description}>` | Yes |
| `properties.houseRules` | `Array<{rule, icon?}>` | Yes |
| `properties.kitchenAmenities` | `string[]` | Yes |
| `properties.bathroomAmenities` | `string[]` | Yes |
| `properties.generalAmenities` | `string[]` | Yes |
| `properties.nearbyServices` | `Array<{name, category, address?, distance?, googleMapsUrl?, phone?, notes?}>` | Yes |
| `checklistTemplates.sections` | `Array<{title, items: Array<{label, type: "check"|"restock"|"deep_clean"|"monthly"}>}>` | Yes |
| `turnovers.checklistData` | `Array<{title, items: Array<{label, type, completed}>}>` (snapshot) | No |
| `turnovers.photos` | `string[]` | Yes (but never written — stubbed) |
| `cleaningTasks.checklistData` | untyped jsonb | No |
| `syncLog.details` | untyped jsonb | No |

### Missing Database Indexes

These columns are queried frequently but have no explicit index:
- `messageTemplates.propertyId`, `messageTemplates.isGlobal`
- `checklistTemplates.propertyId`, `checklistTemplates.isGlobal`
- `turnovers.propertyId`
- `stays.propertyId`
- `cleaningTasks.propertyId`, `cleaningTasks.stayId`, `cleaningTasks.assignedCleanerId`
- `notifications.userId` + `notifications.read` (composite)

### Seed Data

| Script | Creates |
|--------|---------|
| `seed.ts` | Admin user (Mariam), owner MG (Michael), property "Kith 1423", 7 global message templates, 1 global turnover checklist |
| `seed-david.ts` | Owner David Guirguis, property "Kith 1523", property-specific checklist |

---

## Part 5: Feature Modules

### Module 1: Properties (Core)

**Status:** Fully implemented
**CRUD:** POST (create), GET (list/detail), PUT (full update), DELETE (admin-only)
**Slug:** Auto-generated from property name
**Owner scoping:** Properties page filters by `owners.userId OR owners.email` for owner role
**Note:** No PATCH — edit form sends full payload via PUT

### Module 2: Guest Guide

**Status:** Fully implemented
**Route:** `/g/[slug]` — SSR, cached via `cache()`, public, no auth
**Guard:** `property.active === false` → `notFound()`
**Sections (9):** Hero, Check-in Walkthrough, WiFi, Parking, Amenities, House Rules, Nearby Services, Emergency Contacts, Checkout
**Design:** CSS custom properties (`--guest-accent: 0 68% 70%` — warm coral), dark mode support
**Signature UX:** Swipeable check-in walkthrough with Framer Motion AnimatePresence + progress dots
**QR Codes:** `/api/qr/[slug]` — property URL QR + WiFi QR (`?type=wifi`), PNG format, 24h cache

### Module 3: Message Templates & Generator

**Status:** Partially implemented
**Template engine:** Custom regex-based (`{{variable}}` syntax), NOT Mustache. Unresolved vars render as `[missing]`.
**Available variables:** Guest context (guestName, dates), owner info, 20+ property fields
**Template management:** Templates exist in DB but there is NO CRUD API (`/api/templates` is missing). Templates can only be created via seed scripts or direct DB access.
**Generator UI:** Per-property and aggregate (all properties) pages. Guest name/dates entered via text inputs, messages generated and copied to clipboard.

### Module 4: Turnovers & Checklists

**Status:** Partially implemented
**Checklist binding:** Queries property-specific template first, falls back to global. Only one template returned.
**Turnover creation:** Completing a checklist POSTs a snapshot (`checklistData` jsonb) to create a turnover record.
**Known gaps:**
- Template creation UI is disabled (placeholder only)
- No `checklistTemplateId` FK on turnover records (can't trace which template was used)
- `turnovers.photos` column exists but is never written (stubbed)
- `nextGuestCheckin` field accepted but never sent from UI

### Module 5: Calendar & iCal Sync

**Status:** Fully implemented
**Data flow:** iCal feed (Airbnb/Google) → `node-ical` parsing → stays table → auto-generated cleaning tasks
**Sync trigger:** Cron (`POST /api/cron/sync-calendars` with `CRON_SECRET`) or manual (`POST /api/properties/[id]/sync`)
**Stay detection:** SHA-256 hash of uid+dates+summary for deduplication. Status inference from calendar summary text.
**Turnover rules (per property):** `cleanOn` (checkout/checkin/both), `cleanStartOffsetHours`, `cleanDurationHours`, `defaultCleanerId`, `sameDayTurnAllowed`, `timezone` (defaults to `America/Toronto`)
**Calendar UI:** Multi-property and single-property month views with stay bars and task badges
**Cron config:** No `vercel.json` crons — must be configured externally (Coolify cron or system cron)

### Module 6: Cleaners

**Status:** Partially implemented
**Admin side:** CRUD for cleaners (admin/manager). Soft delete only (isActive flag). Task count aggregation.
**Cleaner portal:** Dedicated layout at `/cleaner/*` with bottom tab nav. Dashboard shows today's and upcoming tasks. Task detail shows checklist.
**Known gaps:**
- Cleaner layout has client-only auth — no `requireAuth(["cleaner"])` server guard
- Task detail fetches from calendar API (37-day scan) instead of direct task fetch — fragile and inefficient
- Checklist completion in task detail is local state only — never persisted to DB
- `offered` status exists in schema but no offer flow is implemented

### Module 7: Notifications

**Status:** Partially implemented
**Triggers:** Task assigned, task updated, task cancelled
**Channels:** In-app (notifications table) + email (Resend, optional)
**Email from:** `HostKit <notifications@updates.mkguirguis.com>` (hardcoded)
**Known gaps:**
- Email deep links point to `/tasks/[id]` which doesn't exist (should be `/cleaner/tasks/[id]`)
- Resend silently no-ops if API key missing (no warning log)
- No notification for new stay creation or sync errors
- No unread count API endpoint

### Module 8: File Upload

**Status:** Implemented (presigned URL pattern)
**Storage:** S3-compatible (MinIO, Cloudflare R2, etc.) with `forcePathStyle: true`
**Flow:** Client requests presigned PUT URL → uploads directly to S3 → receives public URL
**Allowed types:** jpeg, png, webp, mp4, quicktime
**Usage:** Currently only wired for checkin media. Turnover photos column exists but unused.

---

## Part 6: Design System

### Admin Theme — "Efficient Clarity"

```css
/* shadcn/ui defaults — slate palette */
--primary: 222.2 47.4% 11.2%;
--radius: 0.5rem;
/* Dark mode fully supported */
```

**Typography:** System default (Inter via shadcn)
**Components:** 18 shadcn/ui components installed (button, card, input, label, textarea, select, tabs, accordion, dialog, toast, skeleton, badge, separator, dropdown-menu, sheet, avatar, switch)
**Layout:** Collapsible left sidebar (desktop), bottom tab bar (mobile)

### Guest Guide Theme — "Premium Concierge"

```css
--guest-accent: 0 68% 70%;           /* Warm coral (softer than original #FF6B6B) */
--guest-accent-soft: 0 68% 95%;
--guest-hero-from: 220 30% 14%;      /* Dark gradient hero */
--guest-hero-to: 220 20% 28%;
--guest-bg: 0 0% 100%;
--guest-card: 0 0% 100%;
--guest-card-border: 220 13% 91%;
/* Dark mode variants defined */
```

**Typography:** System default, 16px base (mobile-optimized)
**Layout:** `max-w-lg` base, `pb-24` for sticky bottom bar clearance
**Signature:** Swipeable check-in walkthrough with Framer Motion + progress dots

### Cleaner Portal Theme

Reuses admin theme with bottom tab navigation and simplified views.

---

## Part 7: External Integrations

| Service | Purpose | Env Var | Required? |
|---------|---------|---------|-----------|
| Google OAuth | Authentication | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Yes |
| PostgreSQL | Database | `DATABASE_URL` | Yes |
| Resend | Notification emails | `RESEND_API_KEY` | No (silently skipped) |
| S3-compatible | File upload (MinIO/R2) | `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` | No (upload disabled) |
| Google Maps | Property location embed | `GOOGLE_MAPS_API_KEY` | No (optional) |
| Cron trigger | iCal sync scheduling | `CRON_SECRET` | No (manual sync only) |

---

## Part 8: Infrastructure

### Docker Compose Stack

```
Docker Compose (Coolify-managed)
├── app (Next.js 14, standalone, port 3000→3100)
│   ├── Multi-stage build (deps → builder → runner)
│   ├── Non-root user (nextjs:1001)
│   ├── Health check: wget /api/health every 30s
│   └── All env vars passed from Coolify
│
├── db (postgres:16-alpine, port 5432 internal)
│   ├── Named volume: hostkit_pgdata
│   ├── Health check: pg_isready every 10s
│   └── restart: unless-stopped
│
└── Network: hostkit (bridge)
```

### Security

- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- HSTS: Applied at Nginx Proxy Manager level
- Auth: Google OAuth (no passwords stored)
- API auth: Session-based (NextAuth) + role validation per endpoint
- Cron auth: Bearer token (`CRON_SECRET`)
- File upload: Presigned URLs (10-min expiry)
- PWA: manifest.json + SVG icon, `display: standalone`

### Error Handling

| Boundary | File | Scope |
|----------|------|-------|
| Root error | `src/app/global-error.tsx` | Catches all unhandled errors |
| Admin error | `src/app/(admin)/admin/error.tsx` | Admin-scoped with retry |
| Admin loading | `src/app/(admin)/admin/loading.tsx` | Skeleton UI |
| 404 page | `src/app/not-found.tsx` | Custom branded 404 |
| Guest 404 | `src/app/g/[slug]/not-found.tsx` | Friendly "guide not available" |
| Guest guide | `notFound()` call in page | Handles missing/inactive properties |

---

## Part 9: Known Gaps & Tech Debt

### High Priority (fix before production testing)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | Email deep links point to `/tasks/[id]` (non-existent route) | `src/lib/notifications.ts` | Broken email notifications |
| 2 | Cleaner checklist completion is local state only — never persisted | `src/app/(cleaner)/cleaner/tasks/[id]/page.tsx` | Cleaners lose checklist progress |
| 3 | No template CRUD API | Missing `/api/templates` POST/PUT/DELETE | Templates can only be created via seed/DB |
| 4 | Cleaner layout has no server-side role guard | `src/app/(cleaner)/layout.tsx` | Any authed user can access cleaner portal |

### Medium Priority (fix before broader rollout)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 5 | Task detail scans 37-day calendar instead of direct fetch | `src/app/(cleaner)/cleaner/tasks/[id]/page.tsx` | N+1 anti-pattern, tasks outside window invisible |
| 6 | Google OAuth token never refreshed for calendar sync | `src/lib/ical-sync.ts` | Google Calendar sync may silently break |
| 7 | No database indexes on frequently queried columns | `src/db/schema.ts` | Performance degrades with data growth |
| 8 | Timezone hardcoded to `America/Toronto` | `src/lib/turnover-generator.ts` (2 places) | Wrong task times for non-Toronto properties |
| 9 | No cron scheduling config | Missing `vercel.json` or external cron | Calendar sync only works via manual trigger |
| 10 | Untyped jsonb columns | `turnovers.checklistData`, `cleaningTasks.checklistData`, `syncLog.details` | No compile-time type safety |

### Low Priority (V2 features)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 11 | `turnovers.photos` column never written | `src/db/schema.ts` | Photo attachments not functional |
| 12 | `offered` task status with no offer flow | Schema enum | Dead code path |
| 13 | `nextGuestCheckin` accepted but never sent | Turnover API | Unused field |
| 14 | No `updatedAt` on 6 tables | Schema | Can't track modification times |
| 15 | No rate limiting on APIs | Global | Acceptable for 2-user testing |

---

## Part 10: Test Coverage

**Current:** 164 tests across 7 files (236ms)

| File | Tests | Coverage |
|------|-------|----------|
| `tests/db/schema.test.ts` | Table exports, role enum, column existence | Core schema |
| `tests/lib/template-engine.test.ts` | Variable replacement, nested vars, missing vars | Template engine |
| `tests/lib/validators.test.ts` | Zod schema validation | Input validation |
| `tests/hooks/use-theme.test.ts` | Theme toggle logic | UI hook |
| `tests/ui/css-variables.test.ts` | CSS variable definitions | Design system |
| `tests/ui/edge-cases.test.ts` | Edge case handling | UI robustness |
| `tests/ui/navigation.test.ts` | Route structure | Navigation |

**Missing test coverage:**
- Cleaners module (0 tests)
- Stays/calendar sync (0 tests)
- Notifications (0 tests)
- Cleaning tasks lifecycle (0 tests)
- API route handlers (0 integration tests)
- Auth guard behavior (0 tests)

---

## Part 11: V2 Backlog (from original blueprint + new items)

### From Original Blueprint (still pending)
- n8n webhook integration for turnover notifications
- Guest guide page view analytics
- Print-friendly turnover checklist (PDF export)
- Multi-language guest guide support (i18n)
- Property cloning
- Bulk nearby services import
- Custom guest guide themes per property
- Guest feedback form (post-checkout survey)
- Calendar integration with iCal sync ✅ (done)
- Mobile PWA for admin ✅ (partially done — manifest added, no service worker)

### New Items (discovered during audit)
- Template CRUD API + management UI
- Cleaner checklist persistence
- Direct task fetch endpoint for cleaner portal
- Google OAuth token refresh for calendar sync
- Database index optimization
- Configurable timezone per property (remove hardcode)
- Notification deep link fix
- Unread notification count endpoint
- Rate limiting middleware
- Observability/error tracking (Sentry or similar)
- Service worker for offline checklist support

---

## Part 12: Architecture Diagram

```
                     ┌────────────────────────────┐
                     │   Nginx Proxy Manager       │
                     │  hostkit.mkgbuilds.com       │
                     │  SSL (Let's Encrypt)         │
                     └──────────┬─────────────────┘
                                │ :443 → :3100
                     ┌──────────▼─────────────────┐
                     │   Coolify (Docker Compose)   │
                     │                              │
                     │  ┌────────────────────────┐  │
                     │  │  Next.js 14 App (:3000) │  │
                     │  │                         │  │
                     │  │  ┌── Admin Portal ────┐ │  │
                     │  │  │  Dashboard          │ │  │
                     │  │  │  Properties CRUD    │ │  │
                     │  │  │  Calendar/Sync      │ │  │
                     │  │  │  Message Generator  │ │  │
                     │  │  │  Turnover Checklists│ │  │
                     │  │  │  Cleaner Mgmt       │ │  │
                     │  │  │  User Management    │ │  │
                     │  │  └─────────────────────┘ │  │
                     │  │                         │  │
                     │  │  ┌── Cleaner Portal ──┐ │  │
                     │  │  │  Task Dashboard     │ │  │
                     │  │  │  Task Checklists    │ │  │
                     │  │  │  Upcoming Schedule  │ │  │
                     │  │  └─────────────────────┘ │  │
                     │  │                         │  │
                     │  │  ┌── Guest Guide (SSR)─┐ │  │
                     │  │  │  /g/[slug]          │ │  │
                     │  │  │  Mobile-first PWA   │ │  │
                     │  │  │  QR + WiFi QR       │ │  │
                     │  │  └─────────────────────┘ │  │
                     │  │                         │  │
                     │  │  ┌── API Routes ───────┐ │  │
                     │  │  │  NextAuth (Google)  │ │  │
                     │  │  │  Properties API     │ │  │
                     │  │  │  Calendar/Sync API  │ │  │
                     │  │  │  Cleaners API       │ │  │
                     │  │  │  Notifications API  │ │  │
                     │  │  │  Upload (S3)        │ │  │
                     │  │  │  Health Check       │ │  │
                     │  │  └─────────────────────┘ │  │
                     │  └──────────┬──────────────┘  │
                     │             │                  │
                     │  ┌──────────▼──────────────┐  │
                     │  │  PostgreSQL 16 (:5432)   │  │
                     │  │  hostkit database        │  │
                     │  │  Volume: hostkit_pgdata  │  │
                     │  └──────────────────────────┘  │
                     └──────────────────────────────┘
                                │
                     ┌──────────▼──────────────────┐
                     │  External Services            │
                     ├──────────────────────────────┤
                     │  Google OAuth (auth)          │
                     │  Resend (email, optional)     │
                     │  S3/MinIO (uploads, optional) │
                     │  Airbnb iCal (calendar sync)  │
                     │  Google Calendar (sync)       │
                     └──────────────────────────────┘
```

---

## Part 13: Production Deployment Checklist

- [ ] Coolify project created (Docker Compose type, `master` branch)
- [ ] All env vars set in Coolify (see `.env.example`)
- [ ] NPM proxy: `hostkit.mkgbuilds.com` → container:3100, SSL enabled
- [ ] Google Console: redirect URI added (`https://hostkit.mkgbuilds.com/api/auth/callback/google`)
- [ ] First deploy successful (`/api/health` returns 200)
- [ ] DB schema pushed (`pnpm db:push` inside container)
- [ ] Seed data loaded (`pnpm db:seed` for Kith 1423)
- [ ] Mariam logs in first (auto-admin)
- [ ] David logs in → Mariam assigns "owner" role at `/admin/settings/users`
- [ ] Mariam links David to his owner record at `/admin/owners`
- [ ] David sees only his properties
- [ ] Guest guide accessible at `/g/kith-1423` (or actual slug)
- [ ] QR codes generate correctly
- [ ] Cron configured for calendar sync (Coolify cron or system-level)
