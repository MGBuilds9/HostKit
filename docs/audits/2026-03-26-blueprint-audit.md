# HostKit Blueprint Audit — 2026-03-26

> **Blueprint:** `docs/blueprints/2026-03-14-hostkit-blueprint.md`
> **Plan:** `docs/superpowers/plans/2026-03-14-hostkit-mvp.md`
> **PRD:** `HOSTKIT-PRD.md`

---

## Executive Summary

**Alignment Score:** 82/100
**Critical Issues:** 2 (CI broken, 1 failing test)
**Architecture Drift:**
- Codebase has grown far beyond the MVP blueprint — 6 major features added (cleaners, calendar/iCal sync, stays, cleaning tasks, notifications, file upload) that are fully implemented but undocumented in the blueprint
- CI workflow is non-functional (wrong package manager + wrong branch name)
- Blueprint is now stale and needs a v2 to reflect the actual system

---

## Blueprint vs Implementation Table

### Core Stack

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Framework | Next.js 14 (App Router) | Next.js 14.2.35 | ✅ | - | None |
| Database | PostgreSQL 16 via Drizzle ORM | Drizzle 0.45.1 + `postgres` driver | ✅ | - | None |
| Auth | NextAuth v5 (Google OAuth) | next-auth 5.0.0-beta.30 + Google provider | ✅ | - | None |
| UI | shadcn/ui + Radix | 18 shadcn components installed | ✅ | - | None |
| Styling | Tailwind CSS 3.4 | tailwindcss 3.4.19 | ✅ | - | None |
| Animations | Framer Motion | framer-motion 12.36.0 | ✅ | - | None |
| Icons | Lucide React | lucide-react 0.577.0 | ✅ | - | None |
| QR Codes | `qrcode` npm | qrcode 1.5.4 | ✅ | - | None |
| Package Manager | pnpm | pnpm-lock.yaml present | ✅ | - | None |
| Docker | Docker Compose (self-hosted) | Dockerfile + docker-compose.yml + dev override | ✅ | - | None |

### Database Schema

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| `users` table | Exists with role enum | ✅ id, email, role (admin/owner/manager/cleaner) | ✅ | - | None |
| `owners` table | Linked to user accounts | ✅ userId FK (nullable) | ✅ | - | None |
| `properties` table | Core property data | ✅ Extensive — all jsonb typed with generics | ✅ | - | None |
| `message_templates` | Mustache templates | ✅ `messageTemplates` with bodyTemplate, isGlobal | ✅ | - | None |
| `checklist_templates` | Turnover checklist defs | ✅ `checklistTemplates` with sections jsonb | ✅ | - | None |
| `turnovers` | Completed records | ✅ propertyId, completedBy, checklistData jsonb | ✅ | - | None |
| NextAuth tables | accounts, sessions, verification_tokens | ✅ All 3 present | ✅ | - | None |
| jsonb type safety | `$type<>` for reads, Zod for writes | ⚠️ Properties typed; turnovers.checklistData untyped | ⚠️ | L | Add type annotations |
| `cleaners` table | Not in blueprint | Exists: fullName, email, phone, isActive | 🔄 | L | Document |
| `stays` table | Not in blueprint | Exists: source, guestName, startDate, endDate, hash | 🔄 | L | Document |
| `cleaning_tasks` table | Not in blueprint | Exists: status enum, assignedCleanerId, checklistData | 🔄 | L | Document |
| `notifications` table | Not in blueprint | Exists: type, title, body, read | 🔄 | L | Document |
| `sync_log` table | Not in blueprint | Exists: eventType, details jsonb | 🔄 | L | Document |

### Routes — Admin

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Dashboard | `/admin` | ✅ `src/app/(admin)/admin/page.tsx` | ✅ | - | None |
| Properties list | `/admin/properties` | ✅ | ✅ | - | None |
| Property create | `/admin/properties/new` | ✅ Multi-step form (5 steps) | ✅ | - | None |
| Property detail | `/admin/properties/[id]` | ✅ | ✅ | - | None |
| Property edit | `/admin/properties/[id]/edit` | ✅ | ✅ | - | None |
| Messages | `/admin/properties/[id]/messages` | ✅ | ✅ | - | None |
| Checklist | `/admin/properties/[id]/checklist` | ✅ | ✅ | - | None |
| Turnovers | `/admin/properties/[id]/turnovers` | ✅ | ✅ | - | None |
| Guide preview | `/admin/properties/[id]/guide` | ✅ + print button | ✅ | - | None |
| Owners list | `/admin/owners` | ✅ | ✅ | - | None |
| Owner create | `/admin/owners/new` | ✅ | ✅ | - | None |
| Templates | `/admin/templates` | ✅ | ✅ | - | None |
| Checklist templates | `/admin/templates/checklist` | ✅ | ✅ | - | None |
| Settings | `/admin/settings` | ✅ | ✅ | - | None |
| Calendar | Not in blueprint | Exists: `/admin/calendar` | 🔄 | L | Document |
| Cleaners | Not in blueprint | Exists: `/admin/cleaners` + `[id]` | 🔄 | L | Document |
| Cleaning tasks | Not in blueprint | Exists: `/admin/cleaning-tasks` | 🔄 | L | Document |
| Aggregate messages | Not in blueprint | Exists: `/admin/messages` | 🔄 | L | Document |
| Aggregate turnovers | Not in blueprint | Exists: `/admin/turnovers` | 🔄 | L | Document |
| Property calendar | Not in blueprint | Exists: `/admin/properties/[id]/calendar` | 🔄 | L | Document |
| Property settings | Not in blueprint | Exists: `/admin/properties/[id]/settings` | 🔄 | L | Document |

### Routes — Cleaner Portal (NOT in blueprint)

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Cleaner dashboard | N/A | `src/app/(cleaner)/cleaner/page.tsx` | 🔄 | L | Document |
| Cleaner profile | N/A | `src/app/(cleaner)/cleaner/profile/page.tsx` | 🔄 | L | Document |
| Upcoming tasks | N/A | `src/app/(cleaner)/cleaner/upcoming/page.tsx` | 🔄 | L | Document |
| Task detail | N/A | `src/app/(cleaner)/cleaner/tasks/[id]/page.tsx` | 🔄 | L | Document |

### Routes — Guest Guide

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Guest guide | SSR at `/g/[slug]` | ✅ Server component with `cache()`, `notFound()` | ✅ | - | None |
| All 9 sections | Hero → checkout | ✅ All present as separate components | ✅ | - | None |
| Coral theme (#FF6B6B) | Hardcoded hex | ⚠️ CSS vars `--guest-accent: 0 68% 70%` ≈ `hsl(0,68%,70%)` — softer coral | ⚠️ | L | Update blueprint |
| Swipeable checkin | Progress dots + swipe | ✅ Framer Motion AnimatePresence + dots (line 85) | ✅ | - | None |
| WiFi copy button | Clipboard copy | ✅ Client component with copied state | ✅ | - | None |
| Sticky bottom bar | Fixed bottom | ✅ Call Host + SOS buttons | ✅ | - | None |
| Mobile-first | max-width constrained | ✅ `max-w-lg` base, `pb-24` for sticky bar | ✅ | - | None |
| Dark mode | Not in blueprint | ✅ Full dark mode CSS vars for guest guide | 🔄 | L | Document |

### API Routes

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| NextAuth | `/api/auth/[...nextauth]` | ✅ | ✅ | - | None |
| Properties CRUD | `/api/properties`, `/api/properties/[id]` | ✅ | ✅ | - | None |
| Messages | `/api/properties/[id]/messages` | ✅ | ✅ | - | None |
| Turnovers | `/api/properties/[id]/turnovers` | ✅ | ✅ | - | None |
| Checklist | `/api/properties/[id]/checklist` | ✅ | ✅ | - | None |
| Owners | `/api/owners` | ✅ | ✅ | - | None |
| Templates | `/api/templates` | ✅ | ✅ | - | None |
| QR generation | `/api/qr/[slug]` | ✅ PNG with WiFi QR support | ✅ | - | None |
| Calendar | Not in blueprint | `/api/calendar` | 🔄 | L | Document |
| Cleaners | Not in blueprint | `/api/cleaners` + `[id]` | 🔄 | L | Document |
| Cleaning tasks | Not in blueprint | `/api/cleaning-tasks/[id]` | 🔄 | L | Document |
| iCal sync cron | Not in blueprint | `/api/cron/sync-calendars` | 🔄 | L | Document |
| Notifications | Not in blueprint | `/api/notifications` + `[id]/read` | 🔄 | L | Document |
| Property stays | Not in blueprint | `/api/properties/[id]/stays` | 🔄 | L | Document |
| iCal settings | Not in blueprint | `/api/properties/[id]/ical-settings` | 🔄 | L | Document |
| Property sync | Not in blueprint | `/api/properties/[id]/sync` | 🔄 | L | Document |
| Property tasks | Not in blueprint | `/api/properties/[id]/cleaning-tasks` | 🔄 | L | Document |
| File upload | Not in blueprint | `/api/upload` | 🔄 | L | Document |

### Auth & Security

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Google OAuth | NextAuth v5 | ✅ DrizzleAdapter + Google provider | ✅ | - | None |
| Role enum | admin, owner, manager | ✅ + `cleaner` role added | 🔄 | L | Document |
| Middleware protection | All `/admin/*` routes | ✅ Cookie check + redirect; also protects `/cleaner/*` | ✅ | - | None |
| Role enforcement | Middleware-level | ⚠️ Middleware only checks cookie, not role. Role enforced in Server Components via `requireAuth()`. By design (Edge Runtime can't use Drizzle). | ⚠️ | L | Document |
| Server-side guard | Role check helper | ✅ `requireAuth(allowedRoles?)` in `auth-guard.ts` | ✅ | - | None |
| Session types | user.role in session | ✅ `next-auth.d.ts` extends Session | ✅ | - | None |

### Lib Files

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| `auth.ts` | NextAuth config | ✅ First user auto-promoted to admin | ✅ | - | None |
| `auth-guard.ts` | Server-side role check | ✅ | ✅ | - | None |
| `template-engine.ts` | Mustache-style renderer | ✅ | ✅ | - | None |
| `utils.ts` | cn() + misc | ✅ | ✅ | - | None |
| `validators.ts` | Zod schemas | ✅ | ✅ | - | None |
| `ical-sync.ts` | Not in blueprint | Exists: iCal parsing, stay inference, DB sync | 🔄 | L | Document |
| `notifications.ts` | Not in blueprint | Exists: Resend email + in-app notifications | 🔄 | L | Document |
| `s3.ts` | Not in blueprint | Exists: S3-compatible file upload | 🔄 | L | Document |
| `turnover-generator.ts` | Not in blueprint | Exists: Auto-generates turnovers from stays | 🔄 | L | Document |

### Infrastructure & CI

| Area | Blueprint Says | Actual (evidence) | Status | Priority | Action |
|------|----------------|-------------------|--------|----------|--------|
| Docker Compose | Self-hosted stack | ✅ `docker-compose.yml` + `docker-compose.dev.yml` | ✅ | - | None |
| Dockerfile | Standalone Next.js | ✅ Present | ✅ | - | None |
| CI pipeline | Not in blueprint | ❌ Broken: uses `npm ci` but project is pnpm | ❌ | **H** | Fix CI |
| CI branch | Not in blueprint | ❌ Triggers on `main` but default branch is `master` | ❌ | **H** | Fix CI |
| Env vars | 4 groups (DB, Auth, OAuth, Maps) | ✅ + 3 extra groups (CRON_SECRET, RESEND, S3) | 🔄 | L | Document |

---

## Linting Results

**ESLint Errors:** 0
**ESLint Warnings:** 1
- `src/components/guest/checkin-walkthrough.tsx:54` — Using `<img>` instead of `next/image`

**TypeScript Errors:** 0 (clean `tsc --noEmit`)

**Test Results:** 162 passed, 1 failed (163 total across 7 files)
- **Failure:** `tests/db/schema.test.ts` — expects `userRoleEnum` to be `["admin", "owner", "manager"]` but actual has 4 values (includes `"cleaner"`). Stale test that doesn't reflect the schema evolution.

---

## Action List

### Immediate (blocking)

- [ ] **Fix CI workflow** — `.github/workflows/ci.yml`:
  - Change `npm ci` → `pnpm install --frozen-lockfile`
  - Change `cache: npm` → `cache: pnpm`
  - Change branch triggers from `main` → `master` (or rename default branch)
- [ ] **Fix stale test** — `tests/db/schema.test.ts:18` — add `"cleaner"` to expected role enum array

### Short-term (tech debt)

- [ ] Replace `<img>` with `next/image` in `checkin-walkthrough.tsx:54`
- [ ] Add `.$type<>()` to untyped jsonb columns (`turnovers.checklistData`, `cleaning_tasks.checklistData`)
- [ ] Add tests for extra modules (cleaners, stays, notifications, ical-sync) — currently 0 test coverage on new features

### Documentation (blueprint updates)

- [ ] **Create Blueprint v2** — The blueprint is significantly stale. These features need to be documented:
  - Cleaners module (admin management + dedicated cleaner portal)
  - Calendar system (iCal sync from Airbnb/Google Calendar, stays management)
  - Cleaning task lifecycle (auto-generation from stays, assignment, status tracking)
  - Notification system (in-app + Resend email)
  - File upload (S3-compatible storage)
  - Cron job (`/api/cron/sync-calendars`)
  - `cleaner` role addition to user role enum
  - Dark mode support for both admin and guest guide
  - Aggregate views (turnovers, messages across all properties)
  - Property-level settings and calendar pages
- [ ] Update design system section — guest theme uses CSS custom properties, not hardcoded hex values. `--guest-accent: 0 68% 70%` (softer coral) instead of `#FF6B6B`
- [ ] Update architecture diagram — add iCal sync flow, Resend email integration, S3 storage, cron job

---

## Undocumented Feature Summary

The codebase has evolved from a **property management + guest guide MVP** into a **full operations platform** with:

| Feature Group | Scope | Implementation Status |
|---------------|-------|----------------------|
| **Cleaner Operations** | Portal, task assignment, status tracking | Fully implemented |
| **Calendar/iCal Sync** | Airbnb + Google Calendar parsing, stay inference | Fully implemented |
| **Cleaning Tasks** | Auto-generated from stays, assigned to cleaners | Fully implemented |
| **Notifications** | In-app + email (Resend) for cleaners and admins | Fully implemented |
| **File Upload** | S3-compatible (Minio) object storage | Fully implemented |
| **Cron Sync** | Scheduled iCal feed synchronization | Fully implemented |
| **Dark Mode** | Admin + guest guide dark theme support | Fully implemented |

None of these are stubs — all are production-grade implementations. This represents roughly **2x the scope** of the original blueprint.

---

**Status Legend:**
- ✅ Compliant — matches blueprint
- ⚠️ Drift — works but deviates (documented above)
- ❌ Missing/Broken — required fix
- 🔄 Extra — exists in code but not in blueprint
