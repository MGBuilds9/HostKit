# HostKit by MKG Builds

Airbnb/short-term rental management platform. Three portals: Admin (PM), Owner (read-only), Cleaner (task management). Plus public guest guides.

## Stack

- **Framework:** Next.js 14.2.35 (App Router)
- **Database:** PostgreSQL 16 via Drizzle ORM 0.45.1
- **Auth:** NextAuth.js v5 beta (Google OAuth)
- **Storage:** MinIO (S3-compatible, on Proxmox .31)
- **Email:** Resend
- **Styling:** Tailwind CSS 3.4 + shadcn/ui
- **Calendar:** node-ical (Airbnb iCal sync)
- **Testing:** Vitest
- **Deploy:** Coolify on Proxmox .31 (Docker, Traefik proxy)
- **Domain:** hostkit.mkgbuilds.com

## Build Commands

```bash
pnpm dev               # Dev server
pnpm build             # Production build
pnpm lint              # ESLint
pnpm test              # Vitest (watch)
pnpm test:run          # Vitest (CI)
pnpm db:push           # Push schema to DB
pnpm db:generate       # Generate Drizzle migrations
pnpm db:seed           # Seed database
```

## Required Environment Variables

See `.env.example` for all vars. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `CRON_SECRET` — iCal sync cron auth
- `RESEND_API_KEY` — Email notifications
- `RESEND_FROM_ADDRESS` — Email sender (optional, defaults to mkguirguis.com)
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` — Object storage
- `AUTH_TRUST_HOST` — Set to `true` for Coolify/reverse proxy deployments

## Deployment

Coolify on Proxmox .31 via Docker Compose. Three services: app (Next.js standalone), db (PostgreSQL 16), cron (Alpine crond for iCal sync every 15min). Traefik handles SSL/routing. MinIO runs as a separate Coolify service on the same host.

Coolify API token: stored in Coolify UI (not in repo). Deploy via Coolify API or git push to master (auto-deploy).

## Known Gaps

- Timezone hardcoded to America/Toronto in turnover generator (configurable via admin settings now, but generator still reads property.timezone)
- OAuth tokens stored in plaintext (NextAuth default — acceptable for current threat model)
- Template forms (message + checklist) use HTML required attrs, not zod+react-hook-form

## Session Log

- 2026-03-28: Full UI/UX overhaul — free-nav tabs, clickable cards, component splitting. 164 tests.
- 2026-03-28: Production readiness + Coolify deploy to .31. 164 tests.
- 2026-04-01: Repo hygiene validation — clean state confirmed.

### 2026-04-05 — Full Production Audit + 6-Phase Roadmap Execution
- **Audit Score:** 62/100 → targeting 90+. All 6 phases executed in one session.
- **Phase 1 (Hardening):** 16 database indexes, env validation (src/env.ts), DB connection pooling (max:10), rate limiting (upload 10/min, cron 1/min), upload size limit (10MB), first-user admin race condition fix (transaction), CI type-check step.
- **Phase 2 (UI/UX):** Accessibility pass (13 aria-labels, skip-to-content links), next/image optimization (6 files), empty state component + loading skeletons, form validation on owner+cleaner forms, SEO (sitemap.ts, robots.ts, ISR on guest guide, JSON-LD structured data).
- **Phase 3 (Owner Portal):** New `(owner)` route group with 5 pages (dashboard, properties, property detail, statements, documents). 4 owner components. ownerStatements + ownerDocuments tables. Full CRUD API for owners with statements and documents.
- **Phase 4 (Features):** ImageUpload component (drag-drop, presigned URL flow), manual stay creation with overlap detection + auto cleaning task generation, cleaner notification preferences (email/push toggles, quiet hours), admin settings (company name, timezone, cleaning duration).
- **Phase 5 (PWA):** Service worker (network-first nav, cache-first static), offline fallback page, push notification infrastructure (subscriptions table, subscribe/unsubscribe API, client button). Actual push sending deferred (needs web-push + VAPID keys).
- **Phase 6 (Testing):** 7 new test files (5 API, 2 integration). Rate limiter, auth guards, input validation, iCal parsing, notifications. Sentry SDK installed with instrumentation hooks. Coverage config (v8, 60% threshold on src/lib/).
- **Tests:** 230/230 passing (was 164). 0 TS errors. Build clean (43 pages).
- **New env vars needed:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- **Schema changes:** Run `pnpm db:push` before deployment (indexes, ownerStatements, ownerDocuments, appSettings, pushSubscriptions, cleaners.notificationPreferences).
- **Deployment:** Pushed to master, Coolify deploy triggered, schema migration applied (4 tables + 22 indexes + column via psql through Proxmox .8 → CT 120). 6 new env vars added via Coolify API. Web-push activated with VAPID keys. Sentry DSN configured. Health check confirmed.
- **Next:** Complete Mariam + David UAT with owner portal access. Set up GitHub webhook for auto-deploy. Fix iCal sync. Add guest guide analytics.

### 2026-04-05 — Video Upload Support + HostKit Logo
- **Changes:** Added video upload support for check-in walkthrough (200MB limit for video, 10MB for images). Created `MediaUpload` component (auto-detects image/video, inline preview for both). Updated `StepListEditor` to use `MediaUpload` with auto-detected `mediaType`. Improved guest-side video player (`preload="metadata"`, `key`-based remount, `aspect-video` container). Designed HostKit house-H logo SVG (coral on navy), added to favicon + sidebar.
- **Tests:** 232/232 passing (+2 new video upload tests). 0 TS errors. Build clean.
- **Next:** Generate raster PNGs (192/512) from SVG for PWA manifest. Complete Mariam + David UAT. GitHub webhook for auto-deploy. Fix iCal sync.

- Apr 6: Repo hygiene — 0 open PRs, 0 unmerged branches. All gates clean. 232/232 tests.
- Apr 5: Full production audit + 6-phase execution. 230 tests.
- Apr 5: UI overhaul + bug fixes + Coolify infrastructure. 164 tests.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
