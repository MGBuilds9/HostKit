# Repository Guidelines

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
