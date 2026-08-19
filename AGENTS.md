# Repository Guidelines

## Global Agent Contract

Follow `/Users/mkgbuilds/AGENTS.md` first, then this repo-specific file. The durable operating guideline lives at `/Volumes/obsidian-vault/12-agents/agent-operating-guidelines.md`.

Do not store session logs, rolling progress notes, or project history in this file. Write session logs to `/Volumes/obsidian-vault/02-sessions/`, agent handoffs to `/Volumes/obsidian-vault/12-agents/<agent>/`, reusable lessons to `/Volumes/obsidian-vault/03-patterns/`, and durable decisions to `/Volumes/obsidian-vault/04-decisions/` after verifying the vault is mounted and writable.

Use the LifeOS/vault MCP for semantic context when available; if it is unavailable, fall back to the mounted vault and state that context is degraded.

## Project Structure & Module Organization
- Next.js 14 App Router in `src/app/`. Three portals: `(admin)`, `(owner)`, `(cleaner)`. Public guest guides at `/guide/[slug]`.
- Drizzle schemas in `src/db/schema.ts`; queries in `src/db/queries/`. Migrations via `drizzle-kit`.
- Shared components in `src/components/`; auth in `src/lib/auth/` (NextAuth v5 beta).
- MinIO S3-compatible storage wrapper in `src/lib/storage/`.
- Tests in `src/__tests__/` (Vitest).

## Build, Test, and Development Commands
Use **pnpm** (pnpm-lock.yaml present):
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Tests: `pnpm test` (watch), `pnpm test:run` (CI)
- Database: `pnpm db:push` (schema sync), `pnpm db:generate` (migrations), `pnpm db:studio` (UI), `pnpm db:seed`

## Coding Style & Naming Conventions
- 2-space indent. React 18 functional components.
- Tailwind 3.4 + shadcn/ui (Radix primitives).
- Names: PascalCase components, camelCase utils, kebab-case files.
- Forms use zod + react-hook-form (existing template forms with HTML required attrs are being migrated — match the new pattern for new forms).

## Testing Guidelines
- Unit: Vitest. Focus on auth guards, rate limiting, iCal parsing, input validation.
- Coverage threshold 60% on `src/lib/`.
- Run `/pre-push-gate` before push.

## Commit & Pull Request Guidelines
- Conventional Commits (e.g., `feat(owner): add statements page`).
- PRs include purpose, linked issue, screenshots for UI changes.
- Note schema changes — they require `pnpm db:push` in Coolify after deploy.

## Workspace & Security
- Deployed on Coolify (Proxmox `.31`) — see `docker-compose.yml` for service shape.
- NextAuth v5 beta: store tokens in `accounts` table (plaintext per current threat model — acceptable, documented).
- Never commit `.env`. Required vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_*`, `CRON_SECRET`, `RESEND_API_KEY`, `S3_*`, `AUTH_TRUST_HOST=true` for reverse proxy.
- Push notifications require VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- Rate limits: upload 10/min, cron 1/min. Preserve when editing those routes.

## Cursor Cloud specific instructions

Standard commands live in `## Build, Test, and Development Commands` above. Notes below are for the cloud VM (dependencies already installed by the startup update script `pnpm install`).

- **Postgres**: PostgreSQL 16 is installed locally in the VM snapshot (cluster `16/main` on `localhost:5432`, role/db `hostkit`/`hostkit`, password `changeme`). It does not auto-start on boot — if `pnpm dev`/tests can't reach the DB, run `sudo pg_ctlcluster 16 main start`.
- **Local env**: a gitignored `.env` (kept in the snapshot) points at local Postgres with placeholder `GOOGLE_CLIENT_*`/`S3_*`/`NEXTAUTH_SECRET`. `src/env.ts` throws at import if required vars are missing, so keep `.env` present. Recreate from `.env.example` if lost.
- **Seeding**: `pnpm db:push` (drizzle-kit) auto-loads `.env`, but `pnpm db:seed` (tsx) does NOT — export env first, e.g. `set -a && . ./.env && set +a && pnpm db:seed`. The seed creates admin user `mariam@example.com`, owner "Michael Guirguis", and property `kith-1423`.
- **Auth is Google OAuth only** — there are no local password credentials. To exercise the auth-gated portals (`/admin`, `/owner`, `/cleaner`) without real OAuth: insert a row into the `sessions` table for a seeded user (`session_token`, `user_id`, future `expires`) and set the browser cookie `authjs.session-token` to that token. Middleware only checks cookie presence; `requireAuth()`/`auth()` resolve role from the DB session.
- **No-auth surface**: the public guest guide `/g/<slug>` needs no login (e.g. `http://localhost:3000/g/kith-1423`); `/api/health` reports DB connectivity.
- **Not run locally**: MinIO/S3 (uploads), Resend email, Sentry, and the iCal cron are external and stubbed with placeholders — features depending on them won't work locally but the app boots fine without them.
