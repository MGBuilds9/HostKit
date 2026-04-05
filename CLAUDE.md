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

- 2026-03-28: Full UI/UX overhaul — free-nav tabs, clickable cards, component splitting. 164 tests.
- 2026-03-28: Production readiness + Coolify deploy to .31. 164 tests.
- 2026-04-01: Repo hygiene validation — clean state confirmed.

### 2026-04-05 — UI Overhaul + Bug Fixes + Coolify Infrastructure
- **Changes:** 9 commits. 3-phase UI overhaul (dark mode contrast, heading scale, touch-target, Inter font config, button/badge/input refinement, guest guide coral accent, checkin a11y, React.memo on calendar components). Fixed RSC error (PropertyCard missing "use client"), tab clickability (flex+overflow-x-auto), edit page scroll behind BottomTabBar, property header nav layout. Fixed Coolify: git repo .git suffix causing API 404, HOSTNAME binding (-H 0.0.0.0), health check host (0.0.0.0 not localhost). Cleaned 4 stale PR previews + ~2.7GB Docker garbage.
- **Servers touched:** Proxmox .8 → CT 120 (coolify-prod, 192.168.0.31)
- **Tests:** 164/164 passing. 0 TS errors. Build clean.
- **Next:** Add GitHub webhook for auto-deploy (Coolify UI). Complete Mariam + David UAT. Fix iCal sync. Add guest guide analytics.

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
