# HostKit by MKG Builds

Airbnb/short-term rental management platform. Next.js + Drizzle ORM + PostgreSQL.

## Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** NextAuth.js (Google OAuth)
- **Storage:** Minio / S3-compatible
- **Email:** Resend
- **Styling:** Tailwind CSS

## Build Commands

```bash
npm run dev            # Dev server
npm run build          # Production build
npm run lint           # ESLint
npm run test           # Vitest (watch)
npm run test:run       # Vitest (CI)
npm run db:push        # Push schema to DB
npm run db:generate    # Generate Drizzle migrations
npm run db:seed        # Seed database
```

## Required Environment Variables

See `.env.example` for all vars. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `CRON_SECRET` — Vercel cron job auth
- `RESEND_API_KEY` — Email
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` — Object storage
