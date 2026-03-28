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

## Known Gaps (from e2e audit)

- First-user admin race condition (no transaction on count+update)
- No rate limiting on APIs (acceptable for 2-user testing)
- Timezone hardcoded to America/Toronto in turnover generator

## Session Log

### 2026-03-28 — Full UI/UX Overhaul + Component Splitting
- **Changes:** 66 files changed (3,836 ins, 3,934 del). Replaced property edit wizard with free-nav shadcn Tabs (all tabs clickable, per-tab save via new PATCH endpoint). Made property cards fully clickable. Centered main content (max-w-7xl). Added collapsible Settings toggle in sidebar. Split 16 oversized components into sub-components (max file: 149 lines, was 497). Added partialPropertySchema + PATCH handler. Deleted 5 old wizard step files. Created 36 new sub-component files.
- **Decisions:** Visual-only settings grouping (no URL changes). Deferred Remotion (overkill for 2-user ops tool). Deferred Airbnb iCal diagnosis to separate session.
- **Tests:** 164/164 passing. 0 TS errors. 0 lint errors.
- **Next:** Airbnb iCal sync diagnosis (separate session). Mariam + David UAT. Browser-verify tabs + card clickability.

### 2026-03-28 — Full Production Readiness + Coolify Deploy
- **Changes:** 4 commits (45 files). Blueprint audit → production readiness → gap fixes → Coolify deployment. Fixed: standalone output, CI (pnpm+master), docker-compose env vars, cron service for iCal sync, health check endpoint. Added: 5 error boundaries, user management page + role API, owner-user linking, PWA manifest, template CRUD API (4 routes) + creation pages, cleaner layout auth guard. Fixed: email deep links, checklist persistence, message debounce, Google token refresh, owner API email fallback, direct task fetch for cleaners. Deployed to Coolify on .31 with Traefik, PostgreSQL, MinIO. Live at hostkit.mkgbuilds.com.
- **Tests:** 164/164 passing. 0 TS errors. 0 lint errors.
- **Next:** Mariam + David UAT testing. Add properties via admin. Connect Airbnb iCal feeds. Test cleaner flow end-to-end.
