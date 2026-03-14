# HostKit MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted property management toolkit with admin dashboard and public guest guides, deployed via Docker on Proxmox.

**Architecture:** Next.js 14 App Router monolith with PostgreSQL (Docker). Admin uses shadcn/ui with role-based auth (NextAuth v5 + Google OAuth). Guest guides are SSR public pages at `/g/[slug]`. Drizzle ORM for type-safe DB access. All data in one Postgres database with jsonb columns for flexible property data.

**Tech Stack:** Next.js 14, TypeScript, PostgreSQL 16, Drizzle ORM, NextAuth v5, shadcn/ui, Tailwind CSS 3.4, Framer Motion, Vitest, pnpm

**Decisions addressing architecture gaps:**
1. NextAuth adapter tables (`accounts`, `sessions`, `verification_tokens`) added to schema
2. Owner linking: admin creates owner, optionally associates existing user — no invite flow in MVP
3. Guest guide hero: gradient background + property name — no image upload until V2
4. `{{guestName}}`: text input at top of message generator UI, user types guest name manually
5. Multi-step form: `react-hook-form` + Zod schemas per step + `useState` for step index
6. Checklist binding: query property-specific template first, fall back to global
7. Loading states: shadcn `Skeleton` components + React `Suspense` boundaries

---

## File Structure

```
hostkit/
├── .env.example
├── .env.local                          # Local dev (gitignored)
├── .gitignore
├── docker-compose.yml
├── docker-compose.dev.yml              # Dev override (hot reload)
├── Dockerfile
├── drizzle.config.ts
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tailwind.config.ts
├── tsconfig.json
├── components.json                     # shadcn/ui config
├── vitest.config.ts
│
├── public/
│   └── favicon.ico
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (fonts, providers)
│   │   ├── page.tsx                    # Redirect → /admin
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx              # Centered card layout
│   │   │   └── login/
│   │   │       └── page.tsx            # Google OAuth login button
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx              # Sidebar + topbar + auth guard
│   │   │   └── admin/
│   │   │       ├── page.tsx            # Dashboard
│   │   │       ├── properties/
│   │   │       │   ├── page.tsx        # Property grid
│   │   │       │   ├── new/
│   │   │       │   │   └── page.tsx    # Multi-step creation
│   │   │       │   └── [id]/
│   │   │       │       ├── page.tsx    # Property detail
│   │   │       │       ├── edit/
│   │   │       │       │   └── page.tsx
│   │   │       │       ├── messages/
│   │   │       │       │   └── page.tsx
│   │   │       │       ├── checklist/
│   │   │       │       │   └── page.tsx
│   │   │       │       ├── turnovers/
│   │   │       │       │   └── page.tsx
│   │   │       │       └── guide/
│   │   │       │           └── page.tsx
│   │   │       ├── owners/
│   │   │       │   ├── page.tsx
│   │   │       │   └── new/
│   │   │       │       └── page.tsx
│   │   │       ├── templates/
│   │   │       │   ├── page.tsx
│   │   │       │   └── checklist/
│   │   │       │       └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   │
│   │   ├── g/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # Guest guide (SSR)
│   │   │       └── opengraph-image.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       │   └── route.ts
│   │       ├── properties/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── checklist/
│   │       │       │   └── route.ts    # GET checklist template
│   │       │       ├── messages/
│   │       │       │   └── route.ts
│   │       │       └── turnovers/
│   │       │           └── route.ts
│   │       ├── owners/
│   │       │   └── route.ts
│   │       ├── templates/
│   │       │   └── route.ts
│   │       └── qr/[slug]/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui (auto-generated)
│   │   ├── admin/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── property-card.tsx
│   │   │   ├── owner-card.tsx
│   │   │   ├── message-generator.tsx
│   │   │   ├── turnover-checklist.tsx
│   │   │   └── property-form/
│   │   │       ├── index.tsx           # Multi-step orchestrator
│   │   │       ├── step-basics.tsx
│   │   │       ├── step-access.tsx
│   │   │       ├── step-amenities.tsx
│   │   │       ├── step-nearby.tsx
│   │   │       └── step-review.tsx
│   │   └── guest/
│   │       ├── guide-layout.tsx
│   │       ├── hero-section.tsx
│   │       ├── checkin-walkthrough.tsx
│   │       ├── wifi-card.tsx
│   │       ├── parking-card.tsx
│   │       ├── amenities-section.tsx
│   │       ├── house-rules-section.tsx
│   │       ├── nearby-services.tsx
│   │       ├── emergency-contacts.tsx
│   │       ├── checkout-section.tsx
│   │       └── sticky-bottom-bar.tsx
│   │
│   ├── db/
│   │   ├── index.ts                    # Drizzle client
│   │   ├── schema.ts                   # Full schema
│   │   └── seed.ts                     # Kith 1423 + templates
│   │
│   ├── types/
│   │   └── next-auth.d.ts              # NextAuth type extensions
│   │
│   ├── lib/
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── auth-guard.ts               # Server-side role check helper
│   │   ├── template-engine.ts          # Mustache-style renderer
│   │   ├── utils.ts                    # cn() + toPascalCase + misc
│   │   └── validators.ts              # Zod schemas for API + forms
│   │
│   ├── middleware.ts                   # NextAuth route protection
│   │
│   └── styles/
│       └── globals.css                 # Tailwind + CSS vars
│
└── tests/
    ├── setup.ts                        # Vitest global setup
    ├── lib/
    │   ├── template-engine.test.ts
    │   └── validators.test.ts
    └── db/
        └── schema.test.ts
```

---

## Chunk 1: Foundation (Tasks 1–6)

Scaffolding, Docker, database schema, auth, seed data, and admin shell. After this chunk, you can log in with Google, see an empty admin dashboard, and have Kith 1423 in the database.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `.gitignore`, `.env.example`, `components.json`, `vitest.config.ts`, `src/styles/globals.css`, `src/lib/utils.ts`

- [ ] **Step 1: Initialize the project**

```bash
cd "/c/Users/Michael/MKG Builds/obsidian-vault/Github/MKG-Builds-Projects/HostKit-by-MKGBuilds"
git init
pnpm create next-app@14 hostkit --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Move contents of `hostkit/` up to project root if nested, or scaffold in-place.

- [ ] **Step 2: Install core dependencies**

```bash
pnpm add drizzle-orm postgres next-auth@beta @auth/drizzle-adapter
pnpm add framer-motion lucide-react qrcode zod react-hook-form @hookform/resolvers
pnpm add class-variance-authority clsx tailwind-merge
pnpm add -D drizzle-kit @types/qrcode vitest @vitejs/plugin-react tsx
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
pnpm dlx shadcn-ui@latest init
```

Select: TypeScript, Default style, Slate base color, CSS variables, `src/styles/globals.css`, `@/components/ui`, `@/lib/utils`.

- [ ] **Step 4: Add essential shadcn components**

```bash
pnpm dlx shadcn-ui@latest add button card input label textarea select tabs accordion dialog toast skeleton badge separator dropdown-menu sheet avatar
```

- [ ] **Step 5: Configure next.config.mjs for Docker**

```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 6: Set up vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 7: Create .env.example**

```env
# Database
DB_PASSWORD=changeme
DATABASE_URL=postgresql://hostkit:changeme@localhost:5432/hostkit

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional
GOOGLE_MAPS_API_KEY=
```

- [ ] **Step 8: Create .gitignore additions**

Append to the Next.js default `.gitignore`:

```
# env
.env
.env.local
.env.production

# Docker
hostkit_pgdata/

# Drizzle
drizzle/meta/
```

- [ ] **Step 9: Add scripts to package.json**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with Tailwind, shadcn/ui, Drizzle, and Vitest"
```

---

### Task 2: Docker Infrastructure

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml`, `.dockerignore`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
# Dockerfile
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

- [ ] **Step 2: Create docker-compose.yml (production)**

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

- [ ] **Step 3: Create docker-compose.dev.yml**

```yaml
# docker-compose.dev.yml
# Usage: docker compose -f docker-compose.yml -f docker-compose.dev.yml up db
# Only starts Postgres — app runs via `pnpm dev` on host for hot reload
version: "3.8"

services:
  db:
    ports:
      - "5432:5432"

  app:
    profiles:
      - disabled
```

- [ ] **Step 4: Create .dockerignore**

```
node_modules
.next
.git
*.md
.env*
docker-compose*.yml
tests/
```

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml docker-compose.dev.yml .dockerignore
git commit -m "infra: add Docker Compose + Dockerfile for PG and Next.js"
```

---

### Task 3: Database Schema

**Files:**
- Create: `drizzle.config.ts`, `src/db/index.ts`, `src/db/schema.ts`
- Test: `tests/db/schema.test.ts`

- [ ] **Step 1: Create drizzle.config.ts**

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create the Drizzle client**

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Create the full schema (including NextAuth adapter tables)**

Write `src/db/schema.ts` with all tables from the PRD PLUS the NextAuth adapter tables:

```typescript
// src/db/schema.ts
import {
  pgTable, uuid, text, boolean, integer, timestamp, jsonb, pgEnum, primaryKey
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccount } from "next-auth/adapters";

// ── Enums ──────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["admin", "owner", "manager"]);

// ── NextAuth Required Tables ───────────────────────────
// NOTE: `name` is nullable here (differs from PRD which says notNull).
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

export const accounts = pgTable("accounts", {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
    compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// ── Domain Tables (from PRD — owners, properties, etc.) ──
// Copy the full owners, properties, messageTemplates,
// checklistTemplates, turnovers tables from the PRD schema section.
// They are already correct — paste them verbatim.

// ── Relations ──────────────────────────────────────────
// Copy relations from PRD + add NextAuth relations:

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// ... plus ownersRelations, propertiesRelations, etc. from PRD
```

**Note to implementer:** The domain tables (owners, properties, messageTemplates, checklistTemplates, turnovers) and their relations are fully defined in `HOSTKIT-PRD.md` lines 172–335. Copy them verbatim into this file below the NextAuth tables.

- [ ] **Step 4: Write schema validation test**

```typescript
// tests/db/schema.test.ts
import { describe, it, expect } from "vitest";
import * as schema from "@/db/schema";

describe("schema exports", () => {
  it("exports all required tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.verificationTokens).toBeDefined();
    expect(schema.owners).toBeDefined();
    expect(schema.properties).toBeDefined();
    expect(schema.messageTemplates).toBeDefined();
    expect(schema.checklistTemplates).toBeDefined();
    expect(schema.turnovers).toBeDefined();
  });

  it("exports userRoleEnum with correct values", () => {
    expect(schema.userRoleEnum.enumValues).toEqual(["admin", "owner", "manager"]);
  });

  it("properties table has slug column marked unique", () => {
    const slugCol = schema.properties.slug;
    expect(slugCol).toBeDefined();
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test:run tests/db/schema.test.ts
```

Expected: PASS — all 3 tests pass.

- [ ] **Step 6: Start dev database and push schema**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up db -d
cp .env.example .env.local
# Edit .env.local: set DB_PASSWORD=devpassword, DATABASE_URL accordingly
pnpm db:push
```

Expected: All tables created in Postgres. Verify with `pnpm db:studio`.

- [ ] **Step 7: Commit**

```bash
git add drizzle.config.ts src/db/ tests/db/
git commit -m "feat: add Drizzle schema with NextAuth adapter tables and domain tables"
```

---

### Task 4: Auth Setup

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-guard.ts`, `src/middleware.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create NextAuth configuration**

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // IMPORTANT: Pass explicit table map so the adapter finds our custom snake_case columns
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // With database strategy, `user` already contains the full DB row.
      // No need for an extra query — just cast to access the `role` field.
      session.user.id = user.id;
      session.user.role = (user as { role: "admin" | "owner" | "manager" }).role;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // First user ever → auto-promote to admin
      if (!user.id) return;
      const [{ value: userCount }] = await db.select({ value: count() }).from(users);
      if (userCount === 1) {
        await db.update(users)
          .set({ role: "admin" })
          .where(eq(users.id, user.id));
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

- [ ] **Step 2: Extend NextAuth types**

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "owner" | "manager";
    } & DefaultSession["user"];
  }
}
```

- [ ] **Step 3: Create auth guard helper**

```typescript
// src/lib/auth-guard.ts
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Role = "admin" | "owner" | "manager";

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect("/admin");
  }
  return session;
}
```

- [ ] **Step 4: Create NextAuth API route**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: Create middleware for route protection**

```typescript
// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
```

- [ ] **Step 6: Create login page**

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      {children}
    </div>
  );
}
```

```typescript
// src/app/(auth)/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">HostKit</CardTitle>
        <p className="text-sm text-muted-foreground">Property management toolkit</p>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={() => signIn("google", { callbackUrl: "/admin" })}>
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: Create root redirect**

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/admin");
}
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-guard.ts src/middleware.ts src/types/ src/app/api/auth/ src/app/\(auth\)/ src/app/page.tsx
git commit -m "feat: add NextAuth v5 with Google OAuth, role-based middleware, and login page"
```

---

### Task 5: Seed Data

**Files:**
- Create: `src/db/seed.ts`

- [ ] **Step 1: Create seed script**

Write `src/db/seed.ts` that:
1. Inserts a default admin user (Mariam)
2. Inserts an owner (MG)
3. Inserts Kith 1423 property with ALL data from PRD lines 700–799
4. Inserts the 7 global message templates
5. Inserts a default turnover checklist template

```typescript
// src/db/seed.ts
import { db } from "./index";
import { users, owners, properties, messageTemplates, checklistTemplates } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // 1. Create admin user (Mariam — she'll also log in via Google OAuth,
  //    but we pre-seed the role so she's admin from the start)
  const [adminUser] = await db.insert(users).values({
    name: "Mariam",
    email: "mariam@example.com",  // Replace with Mariam's actual Google email
    role: "admin",
  }).returning();

  // 2. Create owner (MG) linked to no user account yet — he'll be linked
  //    when he signs in via Google and admin associates the accounts
  const [owner] = await db.insert(owners).values({
    name: "Michael Guirguis",
    email: "mg@mkgbuilds.com",
    phone: "[MG_PHONE]",
  }).returning();

  // 3. Create Kith 1423 — paste ALL fields from PRD lines 700-799
  const [property] = await db.insert(properties).values({
    ownerId: owner.id,
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
  }).returning();

  // 4. Insert 7 global message templates
  // NOTE: The PRD references "message-templates.md" for full bodies.
  // Below are the template shells. The implementer MUST fill in the full
  // bodyTemplate text for each — use {{variable}} syntax from PRD section.
  await db.insert(messageTemplates).values([
    {
      name: "Pre-Booking Screening",
      triggerDescription: "When a guest sends a booking inquiry",
      bodyTemplate: "Hi {{guestName}},\n\nThank you for your interest in {{property.name}}! Before we confirm your reservation, we have a few important details:\n\n1. Government-issued photo ID is required {{property.idLeadHours}} hours before check-in\n2. Third-party bookings are not permitted — the person who booked must be the one checking in\n3. Please review our house rules\n\nIf you're comfortable with these requirements, we'd love to host you!\n\nBest,\nMariam",
      isGlobal: true,
      sortOrder: 1,
    },
    {
      name: "Booking Confirmation",
      triggerDescription: "After a booking is confirmed",
      bodyTemplate: "Hi {{guestName}},\n\nYour reservation at {{property.name}} is confirmed!\n\nCheck-in: {{checkinDate}} at {{property.checkinTime}}\nCheckout: {{checkoutDate}} at {{property.checkoutTime}}\nAddress: {{property.addressFull}}\n\nI'll send you the full check-in instructions closer to your arrival date. In the meantime, please send a photo of your government-issued ID.\n\nLooking forward to hosting you!\nMariam",
      isGlobal: true,
      sortOrder: 2,
    },
    {
      name: "ID Reminder",
      triggerDescription: "If guest hasn't sent ID within 48 hours of booking",
      bodyTemplate: "Hi {{guestName}},\n\nJust a friendly reminder — we require a photo of your government-issued ID at least {{property.idLeadHours}} hours before check-in. This is for security purposes and is required for all guests.\n\nPlease send it at your earliest convenience!\n\nThanks,\nMariam",
      isGlobal: true,
      sortOrder: 3,
    },
    {
      name: "Pre-Arrival Instructions",
      triggerDescription: "30 minutes before check-in time",
      bodyTemplate: "Hi {{guestName}},\n\nWelcome! Here are your check-in instructions for {{property.name}}:\n\n📍 Address: {{property.addressFull}}, Floor {{property.floor}}\n🅿️ Parking: {{property.parkingSpot}}\n📶 WiFi: {{property.wifiName}} / {{property.wifiPassword}}\n🔔 Buzzer: {{property.buzzerName}}\n🌡️ Thermostat: {{property.thermostat}}\n\n📱 Your digital guest guide: {{property.guideUrl}}\n\nPlease review the guide for detailed check-in steps, house rules, and nearby services.\n\nEnjoy your stay!\nMariam",
      isGlobal: true,
      sortOrder: 4,
    },
    {
      name: "Check-In Follow-Up",
      triggerDescription: "Evening of check-in day",
      bodyTemplate: "Hi {{guestName}},\n\nI hope you've settled in well at {{property.name}}! Just checking in to make sure everything is to your liking.\n\nIf you need anything at all, don't hesitate to reach out. Your guest guide has all the info you might need: {{property.guideUrl}}\n\nEnjoy your stay!\nMariam",
      isGlobal: true,
      sortOrder: 5,
    },
    {
      name: "Checkout Reminder",
      triggerDescription: "Evening before checkout",
      bodyTemplate: "Hi {{guestName}},\n\nJust a reminder that checkout is tomorrow at {{property.checkoutTime}}. Before you leave, please:\n\n1. Place used towels in the bathtub\n2. Start the dishwasher or wash any dishes\n3. Take out personal garbage\n4. Turn off all lights and appliances\n5. Close all windows\n6. Leave keys and fob on the kitchen counter\n7. Set thermostat to {{property.thermostat}}\n8. Lock the door behind you\n\nThank you for staying with us — we hope you enjoyed your time!\n\nMariam",
      isGlobal: true,
      sortOrder: 6,
    },
    {
      name: "Review Request",
      triggerDescription: "1 day after checkout",
      bodyTemplate: "Hi {{guestName}},\n\nThank you for staying at {{property.name}}! We hope you had a wonderful experience.\n\nIf you have a moment, we'd really appreciate a review on Airbnb. Your feedback helps us improve and helps other guests make their decision.\n\nWe'd love to host you again in the future!\n\nWarm regards,\nMariam",
      isGlobal: true,
      sortOrder: 7,
    },
  ]);

  // 4. Insert default checklist template
  await db.insert(checklistTemplates).values({
    name: "Standard Turnover",
    isGlobal: true,
    sections: [
      {
        title: "Kitchen",
        items: [
          { label: "Wipe counters", type: "check" },
          { label: "Clean stovetop", type: "check" },
          { label: "Empty dishwasher", type: "check" },
          { label: "Restock dish pods", type: "restock" },
          { label: "Restock sponge", type: "restock" },
          { label: "Coffee/tea/sugar", type: "restock" },
        ],
      },
      {
        title: "Bathrooms",
        items: [
          { label: "Scrub toilet", type: "check" },
          { label: "Clean shower/tub", type: "check" },
          { label: "Wipe mirrors", type: "check" },
          { label: "Restock toilet paper", type: "restock" },
          { label: "Restock shampoo/conditioner/body wash", type: "restock" },
          { label: "Fresh towels (body + face)", type: "restock" },
        ],
      },
      {
        title: "Bedrooms",
        items: [
          { label: "Change bed linens", type: "check" },
          { label: "Vacuum/mop floors", type: "check" },
          { label: "Check closet hangers", type: "check" },
          { label: "Extra bedding in closet", type: "check" },
        ],
      },
      {
        title: "Living Room",
        items: [
          { label: "Vacuum sofa", type: "check" },
          { label: "Wipe coffee table", type: "check" },
          { label: "Refill candy jars", type: "restock" },
          { label: "Check pull-out sofa bedding", type: "check" },
        ],
      },
      {
        title: "General",
        items: [
          { label: "Vacuum all floors", type: "check" },
          { label: "Mop hard floors", type: "check" },
          { label: "Empty all trash bins", type: "check" },
          { label: "Check laundry pods + dryer sheets", type: "restock" },
          { label: "Check fire extinguisher", type: "monthly" },
          { label: "Deep clean oven", type: "deep_clean" },
          { label: "Deep clean fridge", type: "deep_clean" },
        ],
      },
    ],
  });

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
```

**Note to implementer:** Fill in all Kith 1423 fields from PRD lines 700–799 and all 7 message templates from the PRD "Default Message Templates" section.

- [ ] **Step 2: Run seed** (tsx was installed in Task 1 Step 2)

```bash
pnpm db:seed
```

Expected: "Seed complete!" — verify Kith 1423 appears in `pnpm db:studio`.

- [ ] **Step 4: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add seed script with Kith 1423, message templates, and turnover checklist"
```

---

### Task 6: Admin Layout Shell

**Files:**
- Create: `src/app/(admin)/layout.tsx`, `src/app/(admin)/admin/page.tsx`, `src/components/admin/sidebar.tsx`, `src/components/admin/topbar.tsx`

- [ ] **Step 1: Create sidebar component**

```typescript
// src/components/admin/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Users, MessageSquare, ClipboardCheck, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/properties", label: "Properties", icon: Building2 },
  { href: "/admin/owners", label: "Owners", icon: Users },
  { href: "/admin/templates", label: "Templates", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-white">
      <div className="flex h-14 items-center border-b px-6 font-semibold text-lg">
        HostKit
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-slate-100 text-slate-900 font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create topbar component**

```typescript
// src/components/admin/topbar.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Menu } from "lucide-react";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">{session?.user?.name}</span>
        <Avatar className="h-8 w-8">
          <AvatarImage src={session?.user?.image ?? undefined} />
          <AvatarFallback>{session?.user?.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create admin layout with session provider**

```typescript
// src/app/(admin)/layout.tsx
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { requireAuth } from "@/lib/auth-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <SessionProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
```

- [ ] **Step 4: Create dashboard placeholder**

```typescript
// src/app/(admin)/admin/page.tsx
import { db } from "@/db";
import { properties, turnovers, owners } from "@/db/schema";
import { count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, ClipboardCheck } from "lucide-react";

export default async function DashboardPage() {
  const [propertyCount] = await db.select({ count: count() }).from(properties);
  const [ownerCount] = await db.select({ count: count() }).from(owners);
  const [turnoverCount] = await db.select({ count: count() }).from(turnovers);

  const stats = [
    { label: "Properties", value: propertyCount.count, icon: Building2 },
    { label: "Owners", value: ownerCount.count, icon: Users },
    { label: "Turnovers", value: turnoverCount.count, icon: ClipboardCheck },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify dev server runs**

```bash
pnpm dev
```

Navigate to `http://localhost:3000`. Expected: redirect to `/login`, see login card. After Google OAuth setup, signing in should show the dashboard with stat cards (1 property, 1 owner, 0 turnovers from seed).

- [ ] **Step 6: Commit**

```bash
git add src/app/\(admin\)/ src/components/admin/
git commit -m "feat: add admin layout with sidebar, topbar, and dashboard stats"
```

---

## Chunk 2: Guest Guide (Tasks 7–10)

The public guest-facing concierge page. After this chunk, visiting `/g/kith-1423` shows a complete, mobile-first guide with swipeable check-in, WiFi copy, nearby services, and QR code generation.

---

### Task 7: Guest Guide Layout + Hero

**Files:**
- Create: `src/app/g/[slug]/page.tsx`, `src/components/guest/guide-layout.tsx`, `src/components/guest/hero-section.tsx`

- [ ] **Step 1: Create guest guide layout shell**

```typescript
// src/components/guest/guide-layout.tsx
import { Inter, DM_Sans } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export function GuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} ${dmSans.variable} font-sans min-h-screen bg-white`}>
      <div className="mx-auto max-w-lg">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create hero section**

```typescript
// src/components/guest/hero-section.tsx
interface HeroProps {
  name: string;
  description: string | null;
  city: string;
}

export function HeroSection({ name, description, city }: HeroProps) {
  return (
    <section className="bg-gradient-to-br from-slate-900 to-slate-700 text-white px-6 py-16 rounded-b-3xl">
      <p className="text-sm font-medium text-white/70 uppercase tracking-wide">Welcome to</p>
      <h1 className="font-[family-name:var(--font-dm-sans)] text-4xl font-bold mt-2">{name}</h1>
      <div className="w-12 h-0.5 bg-[#FF6B6B] mt-4 mb-4" />
      <p className="text-white/80 text-lg">
        {description ?? `Your home away from home in ${city}`}
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Create the SSR guest guide page**

```typescript
// src/app/g/[slug]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GuideLayout } from "@/components/guest/guide-layout";
import { HeroSection } from "@/components/guest/hero-section";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await db.query.properties.findFirst({
    where: eq(properties.slug, params.slug),
  });
  if (!property) return { title: "Not Found" };
  return {
    title: `${property.name} — Guest Guide`,
    description: property.description ?? `Guest guide for ${property.name}`,
    openGraph: {
      title: property.name,
      description: property.description ?? `Guest guide for ${property.name}`,
    },
  };
}

export default async function GuestGuidePage({ params }: Props) {
  const property = await db.query.properties.findFirst({
    where: eq(properties.slug, params.slug),
    with: { owner: true },
  });

  if (!property || !property.active) {
    notFound();
  }

  return (
    <GuideLayout>
      <HeroSection
        name={property.name}
        description={property.description}
        city={property.addressCity}
      />
      {/* Remaining sections added in Tasks 8-10 */}
      <div className="px-5 py-6 space-y-5">
        <p className="text-center text-slate-400 text-sm">
          More sections coming soon...
        </p>
      </div>
    </GuideLayout>
  );
}
```

- [ ] **Step 4: Verify the page renders**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/g/kith-1423`. Expected: gradient hero with "Welcome to Kith 1423" and the tagline.

- [ ] **Step 5: Commit**

```bash
git add src/app/g/ src/components/guest/
git commit -m "feat: add guest guide page with SSR and hero section"
```

---

### Task 8: Guest Guide — Interactive Sections

**Files:**
- Create: `src/components/guest/checkin-walkthrough.tsx`, `src/components/guest/wifi-card.tsx`, `src/components/guest/parking-card.tsx`, `src/components/guest/house-rules-section.tsx`

- [ ] **Step 1: Create swipeable check-in walkthrough**

```typescript
// src/components/guest/checkin-walkthrough.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Step {
  step: number;
  title: string;
  description: string;
  icon?: string;
}

export function CheckinWalkthrough({ steps }: { steps: Step[] }) {
  const [current, setCurrent] = useState(0);

  // Dynamically resolve icon by name
  const IconComponent = steps[current].icon
    ? (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
        toPascalCase(steps[current].icon!)
      ] ?? LucideIcons.MapPin
    : LucideIcons.MapPin;

  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">
        Check-In Walkthrough
      </h2>
      <div className="bg-[#F9FAFB] rounded-2xl p-5 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B6B]/10">
                <IconComponent className="h-5 w-5 text-[#FF6B6B]" />
              </div>
              <span className="text-xs font-medium text-slate-400 uppercase">
                Step {current + 1} of {steps.length}
              </span>
            </div>
            <h3 className="font-semibold text-lg">{steps[current].title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{steps[current].description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-6 bg-[#FF6B6B]" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrent(Math.min(steps.length - 1, current + 1))}
            disabled={current === steps.length - 1}
            className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function toPascalCase(str: string): string {
  return str.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
}
```

- [ ] **Step 2: Create WiFi card with copy-to-clipboard**

```typescript
// src/components/guest/wifi-card.tsx
"use client";

import { useState } from "react";
import { Wifi, Copy, Check } from "lucide-react";

interface WifiProps {
  name: string;
  password: string;
}

export function WifiCard({ name, password }: WifiProps) {
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="px-5">
      <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Wifi className="h-4 w-4 text-[#FF6B6B]" />
          <h3 className="font-semibold">WiFi</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Network</span>
            <span className="font-medium">{name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Password</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">{password}</span>
              <button
                onClick={copyPassword}
                className="flex items-center gap-1 rounded-lg bg-[#FF6B6B]/10 px-3 py-1.5 text-xs font-medium text-[#FF6B6B] hover:bg-[#FF6B6B]/20 transition-colors"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create parking card**

```typescript
// src/components/guest/parking-card.tsx
import { SquareParking, ExternalLink } from "lucide-react";

interface ParkingProps {
  spot: string | null;
  instructions: string | null;
  latitude: string | null;
  longitude: string | null;
}

export function ParkingCard({ spot, instructions, latitude, longitude }: ParkingProps) {
  if (!spot && !instructions) return null;

  const mapsUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : null;

  return (
    <section className="px-5">
      <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <SquareParking className="h-4 w-4 text-[#FF6B6B]" />
          <h3 className="font-semibold">Parking</h3>
        </div>
        {spot && (
          <p className="font-medium mb-2">Spot: {spot}</p>
        )}
        {instructions && (
          <p className="text-sm text-slate-600 leading-relaxed">{instructions}</p>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[#FF6B6B] hover:underline"
          >
            Open in Maps <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create house rules section**

```typescript
// src/components/guest/house-rules-section.tsx
import * as LucideIcons from "lucide-react";
import { ShieldAlert } from "lucide-react";

interface Rule {
  rule: string;
  icon?: string;
}

function toPascalCase(str: string): string {
  return str.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
}

export function HouseRulesSection({ rules, securityNote }: { rules: Rule[]; securityNote: string | null }) {
  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">House Rules</h2>
      <div className="space-y-2">
        {rules.map((r, i) => {
          const Icon = r.icon
            ? (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[toPascalCase(r.icon)] ?? LucideIcons.CircleDot
            : LucideIcons.CircleDot;
          return (
            <div key={i} className="flex items-center gap-3 py-2">
              <Icon className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-sm">{r.rule}</span>
            </div>
          );
        })}
      </div>
      {securityNote && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{securityNote}</p>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Wire sections into guest guide page**

Update `src/app/g/[slug]/page.tsx` to import and render these components, passing data from the property query.

- [ ] **Step 6: Commit**

```bash
git add src/components/guest/ src/app/g/
git commit -m "feat: add check-in walkthrough, WiFi copy, parking, and house rules to guest guide"
```

---

### Task 9: Guest Guide — Amenities, Nearby, Checkout, Emergency

**Files:**
- Create: `src/components/guest/amenities-section.tsx`, `src/components/guest/nearby-services.tsx`, `src/components/guest/checkout-section.tsx`, `src/components/guest/emergency-contacts.tsx`, `src/components/guest/sticky-bottom-bar.tsx`

- [ ] **Step 1: Create amenities accordion section**

```typescript
// src/components/guest/amenities-section.tsx
"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UtensilsCrossed, Bath, Sofa } from "lucide-react";

interface AmenitiesProps {
  kitchen: string[] | null;
  bathroom: string[] | null;
  general: string[] | null;
}

export function AmenitiesSection({ kitchen, bathroom, general }: AmenitiesProps) {
  const sections = [
    { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed, items: kitchen },
    { id: "bathroom", label: "Bathrooms", icon: Bath, items: bathroom },
    { id: "general", label: "General Amenities", icon: Sofa, items: general },
  ].filter(s => s.items && s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Amenities</h2>
      <Accordion type="multiple" className="space-y-2">
        {sections.map(({ id, label, icon: Icon, items }) => (
          <AccordionItem key={id} value={id} className="bg-white rounded-xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-4">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-[#FF6B6B]" />
                {label}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid grid-cols-1 gap-1.5 pb-2">
                {items!.map((item, i) => (
                  <li key={i} className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
```

- [ ] **Step 2: Create nearby services with category tabs**

```typescript
// src/components/guest/nearby-services.tsx
"use client";

import { useState } from "react";
import { MapPin, Phone, Navigation } from "lucide-react";

interface Service {
  name: string;
  category: string;
  address?: string;
  distance?: string;
  googleMapsUrl?: string;
  phone?: string;
  notes?: string;
}

const categoryLabels: Record<string, string> = {
  grocery: "Grocery",
  restaurant: "Food",
  pharmacy: "Pharmacy",
  hospital: "Hospital",
  transit: "Transit",
  gas: "Gas",
  gym: "Gym",
  park: "Park",
  entertainment: "Entertainment",
  other: "Other",
};

export function NearbyServices({ services }: { services: Service[] }) {
  const categories = [...new Set(services.map(s => s.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  const filtered = services.filter(s => s.category === activeCategory);

  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Nearby</h2>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-[#FF6B6B] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {categoryLabels[cat] ?? cat}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.map((svc, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-sm">{svc.name}</h4>
                {svc.distance && (
                  <p className="text-xs text-slate-400 mt-0.5">{svc.distance}</p>
                )}
                {svc.notes && (
                  <p className="text-xs text-slate-500 mt-1">{svc.notes}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-3">
              {svc.googleMapsUrl && (
                <a href={svc.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1 text-xs font-medium text-[#FF6B6B]">
                  <Navigation className="h-3 w-3" /> Directions
                </a>
              )}
              {svc.phone && (
                <a href={`tel:${svc.phone}`}
                   className="flex items-center gap-1 text-xs font-medium text-[#FF6B6B]">
                  <Phone className="h-3 w-3" /> Call
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create checkout section**

```typescript
// src/components/guest/checkout-section.tsx
interface CheckoutStep {
  step: number;
  title: string;
  description: string;
}

export function CheckoutSection({ steps, time }: { steps: CheckoutStep[]; time: string }) {
  // Format time: "11:00" → "11:00 AM"
  const formatted = new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-1">Checkout</h2>
      <p className="text-sm text-slate-500 mb-3">Please complete by {formatted}</p>
      <div className="space-y-2">
        {steps.map((s) => (
          <div key={s.step} className="flex items-start gap-3 py-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 text-xs text-slate-400 mt-0.5">
              {s.step}
            </div>
            <div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-xs text-slate-500">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create emergency contacts**

```typescript
// src/components/guest/emergency-contacts.tsx
import { Phone, Siren } from "lucide-react";

interface Props {
  emergency: string | null;
  hostPhone: string | null;
  ownerPhone: string | null;
}

export function EmergencyContacts({ emergency, hostPhone, ownerPhone }: Props) {
  const contacts = [
    emergency && { label: "Emergency", number: emergency, urgent: true },
    hostPhone && { label: "Your Host (Mariam)", number: hostPhone, urgent: false },
    ownerPhone && { label: "Property Owner", number: ownerPhone, urgent: false },
  ].filter(Boolean) as { label: string; number: string; urgent: boolean }[];

  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">Emergency Contacts</h2>
      <div className="space-y-2">
        {contacts.map((c) => (
          <a
            key={c.label}
            href={`tel:${c.number}`}
            className={`flex items-center justify-between rounded-xl p-4 transition-colors ${
              c.urgent
                ? "bg-red-50 border border-red-200 hover:bg-red-100"
                : "bg-white border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3">
              {c.urgent ? (
                <Siren className="h-4 w-4 text-red-500" />
              ) : (
                <Phone className="h-4 w-4 text-slate-500" />
              )}
              <span className="text-sm font-medium">{c.label}</span>
            </div>
            <span className={`text-sm font-mono ${c.urgent ? "text-red-600" : "text-slate-500"}`}>
              {c.number}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create sticky bottom bar**

```typescript
// src/components/guest/sticky-bottom-bar.tsx
import { Phone, AlertTriangle } from "lucide-react";

export function StickyBottomBar({ hostPhone, emergency }: { hostPhone: string | null; emergency: string | null }) {
  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3 max-w-lg mx-auto">
      {hostPhone && (
        <a
          href={`tel:${hostPhone}`}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium"
        >
          <Phone className="h-4 w-4" /> Call Host
        </a>
      )}
      {emergency && (
        <a
          href={`tel:${emergency}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-red-500 text-white px-4 py-2.5 text-sm font-medium"
        >
          <AlertTriangle className="h-4 w-4" /> SOS
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire all sections into guest guide page**

Update `src/app/g/[slug]/page.tsx` to render all sections in order: Hero → Check-in Walkthrough → WiFi → Parking → House Rules → Amenities → Nearby → Checkout → Emergency → Sticky Bar. Add `pb-20` padding at bottom to account for sticky bar.

- [ ] **Step 7: Verify full guest guide renders**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/g/kith-1423`. Verify all sections render with seed data.

- [ ] **Step 8: Commit**

```bash
git add src/components/guest/ src/app/g/
git commit -m "feat: complete guest guide with amenities, nearby services, checkout, emergency, and sticky bar"
```

---

### Task 10: QR Code Generation API

**Files:**
- Create: `src/app/api/qr/[slug]/route.ts`

- [ ] **Step 1: Create QR code API route**

```typescript
// src/app/api/qr/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const property = await db.query.properties.findFirst({
    where: eq(properties.slug, params.slug),
  });

  if (!property) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const type = request.nextUrl.searchParams.get("type");

  let data: string;
  if (type === "wifi" && property.wifiName && property.wifiPassword) {
    data = `WIFI:T:WPA;S:${property.wifiName};P:${property.wifiPassword};;`;
  } else {
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://hostkit.mkgbuilds.com";
    data = `${baseUrl}/g/${property.slug}`;
  }

  const buffer = await QRCode.toBuffer(data, {
    type: "png",
    width: 400,
    margin: 2,
    color: { dark: "#0F172A", light: "#FFFFFF" },
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
```

- [ ] **Step 2: Verify QR endpoints**

```bash
# Guide QR
curl -o /dev/null -w "%{http_code}" http://localhost:3000/api/qr/kith-1423
# Expected: 200

# WiFi QR
curl -o /dev/null -w "%{http_code}" "http://localhost:3000/api/qr/kith-1423?type=wifi"
# Expected: 200
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/qr/
git commit -m "feat: add QR code generation API for guest guide and WiFi"
```

---

## Chunk 3: Admin CRUD (Tasks 11–14)

Property management, owner CRUD, and role-based access. After this chunk, Mariam can create/edit properties, manage owners, and view property details with QR previews.

---

### Task 11: Zod Validators

**Files:**
- Create: `src/lib/validators.ts`
- Test: `tests/lib/validators.test.ts`

- [ ] **Step 1: Write validator tests**

```typescript
// tests/lib/validators.test.ts
import { describe, it, expect } from "vitest";
import { propertyBasicsSchema, propertyAccessSchema, createPropertySchema } from "@/lib/validators";

describe("propertyBasicsSchema", () => {
  it("validates correct input", () => {
    const result = propertyBasicsSchema.safeParse({
      name: "Test Property",
      addressStreet: "123 Main St",
      addressCity: "Toronto",
      addressProvince: "ON",
      addressPostal: "M5V 2T6",
    });
    expect(result.success).toBe(true);
  });

  it("auto-generates slug from name on the combined schema", () => {
    // Slug transform lives on createPropertySchema, not on propertyBasicsSchema
    const result = createPropertySchema.safeParse({
      name: "My Cool Place 42",
      ownerId: "00000000-0000-0000-0000-000000000001",
      addressStreet: "123 Main",
      addressCity: "Toronto",
      addressProvince: "ON",
      addressPostal: "M5V 2T6",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("my-cool-place-42");
    }
  });

  it("rejects missing required fields", () => {
    const result = propertyBasicsSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });
});

describe("propertyAccessSchema", () => {
  it("validates check-in steps array", () => {
    const result = propertyAccessSchema.safeParse({
      checkinTime: "15:00",
      checkoutTime: "11:00",
      checkinSteps: [
        { step: 1, title: "Arrive", description: "Park your car" },
      ],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run tests/lib/validators.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create validators**

```typescript
// src/lib/validators.ts
import { z } from "zod";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Step 1: Basics
// NOTE: No .transform() here — slug auto-gen is on the combined schema below.
// This keeps per-step schemas as plain z.object() so .merge() works correctly.
export const propertyBasicsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  ownerId: z.string().uuid("Owner is required"),  // Required — DB column is NOT NULL
  addressStreet: z.string().min(1, "Street is required"),
  addressUnit: z.string().optional(),
  addressCity: z.string().min(1, "City is required"),
  addressProvince: z.string().min(1, "Province is required"),
  addressPostal: z.string().min(1, "Postal code is required"),
  addressCountry: z.string().default("Canada"),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  floor: z.string().optional(),
  layout: z.string().optional(),
  beds: z.array(z.object({
    type: z.string(),
    count: z.number().int().positive(),
    location: z.string(),
  })).optional(),
});

// Step 2: Access & Check-In
export const propertyAccessSchema = z.object({
  wifiName: z.string().optional(),
  wifiPassword: z.string().optional(),
  parkingSpot: z.string().optional(),
  parkingInstructions: z.string().optional(),
  buzzerName: z.string().optional(),
  buzzerInstructions: z.string().optional(),
  checkinTime: z.string().default("15:00"),
  checkoutTime: z.string().default("11:00"),
  preArrivalLeadMins: z.number().int().default(30),
  checkinSteps: z.array(z.object({
    step: z.number().int(),
    title: z.string(),
    description: z.string(),
    icon: z.string().optional(),
  })).optional(),
  checkoutSteps: z.array(z.object({
    step: z.number().int(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  securityNote: z.string().optional(),
});

// Step 3: Amenities & Rules
export const propertyAmenitiesSchema = z.object({
  kitchenAmenities: z.array(z.string()).optional(),
  bathroomAmenities: z.array(z.string()).optional(),
  generalAmenities: z.array(z.string()).optional(),
  houseRules: z.array(z.object({
    rule: z.string(),
    icon: z.string().optional(),
  })).optional(),
  idRequired: z.boolean().default(true),
  idLeadHours: z.number().int().default(72),
  thirdPartyAllowed: z.boolean().default(false),
});

// Step 4: Nearby & Emergency
export const propertyNearbySchema = z.object({
  nearbyServices: z.array(z.object({
    name: z.string(),
    category: z.enum(["grocery", "restaurant", "pharmacy", "hospital", "transit", "gas", "gym", "park", "entertainment", "other"]),
    address: z.string().optional(),
    distance: z.string().optional(),
    googleMapsUrl: z.string().url().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  })).optional(),
  emergencyContact: z.string().optional(),
  hostPhone: z.string().optional(),
  ownerPhone: z.string().optional(),
  thermostatDefault: z.string().default("22°C"),
});

// Full property (for API create/update)
// Use .merge() (not .and()) so all schemas compose as plain objects,
// then apply .transform() for slug auto-generation on the merged result.
export const createPropertySchema = propertyBasicsSchema
  .merge(propertyAccessSchema)
  .merge(propertyAmenitiesSchema)
  .merge(propertyNearbySchema)
  .transform((data) => ({
    ...data,
    slug: data.slug || slugify(data.name),
  }));

// Owner
export const createOwnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  userId: z.string().uuid().optional(),
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run tests/lib/validators.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators.ts tests/lib/validators.test.ts
git commit -m "feat: add Zod validators for property creation steps and owners"
```

---

### Task 12: Properties API Routes

**Files:**
- Create: `src/app/api/properties/route.ts`, `src/app/api/properties/[id]/route.ts`

- [ ] **Step 1: Create properties list + create endpoint**

```typescript
// src/app/api/properties/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPropertySchema } from "@/lib/validators";

// GET /api/properties — list all (filtered for owners)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let result;
  if (session.user.role === "owner") {
    // Owner sees only their properties
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
    });
    result = owner
      ? await db.query.properties.findMany({
          where: eq(properties.ownerId, owner.id),
          with: { owner: true },
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        })
      : [];
  } else {
    result = await db.query.properties.findMany({
      with: { owner: true },
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  return NextResponse.json(result);
}

// POST /api/properties — create new property
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [property] = await db.insert(properties).values(parsed.data).returning();
  return NextResponse.json(property, { status: 201 });
}
```

- [ ] **Step 2: Create single property GET/PUT/DELETE**

```typescript
// src/app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createPropertySchema } from "@/lib/validators";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
    with: { owner: true },
  });

  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Owner-scoped access: owners can only view their own properties
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
    });
    if (!owner || property.ownerId !== owner.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(property);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [updated] = await db.update(properties)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(properties.id, params.id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(properties).where(eq(properties.id, params.id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/properties/
git commit -m "feat: add properties API routes with role-based access control"
```

---

### Task 13: Property List + Card UI

**Files:**
- Create: `src/app/(admin)/admin/properties/page.tsx`, `src/components/admin/property-card.tsx`

- [ ] **Step 1: Create property card component**

```typescript
// src/components/admin/property-card.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MessageSquare, ClipboardCheck, QrCode } from "lucide-react";

interface PropertyCardProps {
  id: string;
  name: string;
  slug: string;
  addressCity: string;
  layout: string | null;
  active: boolean;
  ownerName: string;
}

export function PropertyCard({ id, name, slug, addressCity, layout, active, ownerName }: PropertyCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/admin/properties/${id}`} className="font-semibold hover:underline">
              {name}
            </Link>
            <p className="text-sm text-muted-foreground">{addressCity} {layout && `· ${layout}`}</p>
          </div>
          <Badge variant={active ? "default" : "secondary"}>
            {active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">Owner: {ownerName}</p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/properties/${id}/guide`}>
              <QrCode className="h-3 w-3 mr-1" /> Guide
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/properties/${id}/messages`}>
              <MessageSquare className="h-3 w-3 mr-1" /> Messages
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/properties/${id}/checklist`}>
              <ClipboardCheck className="h-3 w-3 mr-1" /> Turnover
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create property list page**

```typescript
// src/app/(admin)/admin/properties/page.tsx
import Link from "next/link";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyCard } from "@/components/admin/property-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { eq } from "drizzle-orm";
import { owners } from "@/db/schema";

export default async function PropertiesPage() {
  const session = await requireAuth();

  let propertyList;
  if (session.user.role === "owner") {
    const owner = await db.query.owners.findFirst({
      where: eq(owners.userId, session.user.id),
    });
    propertyList = owner
      ? await db.query.properties.findMany({
          where: eq(properties.ownerId, owner.id),
          with: { owner: true },
        })
      : [];
  } else {
    propertyList = await db.query.properties.findMany({
      with: { owner: true },
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Properties</h1>
        {session.user.role !== "owner" && (
          <Button asChild>
            <Link href="/admin/properties/new">
              <Plus className="h-4 w-4 mr-2" /> Add Property
            </Link>
          </Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {propertyList.map((p) => (
          <PropertyCard
            key={p.id}
            id={p.id}
            name={p.name}
            slug={p.slug}
            addressCity={p.addressCity}
            layout={p.layout}
            active={p.active ?? true}
            ownerName={p.owner.name}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/properties/page.tsx src/components/admin/property-card.tsx
git commit -m "feat: add property list page with card grid and role filtering"
```

---

### Task 14: Multi-Step Property Creation Form

**Files:**
- Create: `src/app/(admin)/admin/properties/new/page.tsx`, `src/components/admin/property-form/index.tsx`, `src/components/admin/property-form/step-basics.tsx`, `src/components/admin/property-form/step-access.tsx`, `src/components/admin/property-form/step-amenities.tsx`, `src/components/admin/property-form/step-nearby.tsx`, `src/components/admin/property-form/step-review.tsx`

- [ ] **Step 1: Create the multi-step form orchestrator**

```typescript
// src/components/admin/property-form/index.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StepBasics } from "./step-basics";
import { StepAccess } from "./step-access";
import { StepAmenities } from "./step-amenities";
import { StepNearby } from "./step-nearby";
import { StepReview } from "./step-review";

const STEPS = ["Basics", "Access & Check-In", "Amenities & Rules", "Nearby & Emergency", "Review"];

interface PropertyFormProps {
  owners: { id: string; name: string }[];
  initialData?: Record<string, unknown>;  // Pre-populated for edit mode
  propertyId?: string;                    // Set when editing (uses PUT instead of POST)
}

export function PropertyForm({ owners, initialData, propertyId }: PropertyFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData ?? {});
  const [saving, setSaving] = useState(false);

  function updateData(stepData: Record<string, unknown>) {
    setFormData((prev) => ({ ...prev, ...stepData }));
  }

  async function handleSubmit() {
    setSaving(true);
    const url = propertyId ? `/api/properties/${propertyId}` : "/api/properties";
    const method = propertyId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      router.push("/admin/properties");
      router.refresh();
    } else {
      setSaving(false);
      // Handle error — show toast
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 text-center text-xs py-2 rounded ${
              i === step ? "bg-slate-900 text-white" : i < step ? "bg-slate-200" : "bg-slate-100 text-slate-400"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <StepBasics data={formData} owners={owners} onNext={(d) => { updateData(d); setStep(1); }} />}
      {step === 1 && <StepAccess data={formData} onNext={(d) => { updateData(d); setStep(2); }} onBack={() => setStep(0)} />}
      {step === 2 && <StepAmenities data={formData} onNext={(d) => { updateData(d); setStep(3); }} onBack={() => setStep(1)} />}
      {step === 3 && <StepNearby data={formData} onNext={(d) => { updateData(d); setStep(4); }} onBack={() => setStep(2)} />}
      {step === 4 && <StepReview data={formData} onSubmit={handleSubmit} onBack={() => setStep(3)} saving={saving} />}
    </div>
  );
}
```

- [ ] **Step 2: Implement each step component**

Each step component receives `data` (current form state), `onNext` (callback with step data), and `onBack`. Use `react-hook-form` with the corresponding Zod schema from `src/lib/validators.ts` for validation. Use shadcn/ui `Input`, `Label`, `Textarea`, `Select` components.

**StepBasics:** Property name (auto-generates slug preview), owner select dropdown, address fields, floor, layout, dynamic bed list (add/remove bed entries).

**StepAccess:** WiFi name/password, parking spot/instructions, buzzer fields, check-in/checkout times, dynamic check-in steps list (add/reorder/remove with title + description + optional icon), checkout steps, security note.

**StepAmenities:** Three tag-picker inputs for kitchen/bathroom/general amenities (type to add, click to remove), dynamic house rules list with icon picker, toggles for ID required and third-party allowed.

**StepNearby:** Dynamic nearby services list (each has name, category dropdown, address, distance, Google Maps URL, phone, notes). Emergency contact, host phone, owner phone, thermostat default.

**StepReview:** Read-only summary of all data. Shows each section's fields. "Save & Publish" button triggers `onSubmit`.

**Note to implementer:** Each step component is ~80-120 lines. Use `useForm` from react-hook-form with `zodResolver` from `@hookform/resolvers/zod` for validation. Reference the validator schemas in `src/lib/validators.ts`.

**Critical:** Each step component must:
1. Accept `data: Record<string, unknown>` and use it as `defaultValues` in `useForm()` so the form is pre-populated in both create (empty) and edit (filled) modes.
2. Call `trigger()` (react-hook-form validation) before calling `onNext()`. Only advance the step if validation passes. This ensures per-step Zod validation, not just final submission validation.

- [ ] **Step 3: Create the new property page wrapper**

```typescript
// src/app/(admin)/admin/properties/new/page.tsx
import { db } from "@/db";
import { owners } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyForm } from "@/components/admin/property-form";

export default async function NewPropertyPage() {
  await requireAuth(["admin", "manager"]);
  const ownerList = await db.select({ id: owners.id, name: owners.name }).from(owners);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Add Property</h1>
      <PropertyForm owners={ownerList} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/property-form/ src/app/\(admin\)/admin/properties/new/
git commit -m "feat: add multi-step property creation form with Zod validation"
```

---

## Chunk 4: Operations (Tasks 15–18)

Message templates, message generator, turnover checklists, and owner management. After this chunk, the full MVP is functional.

---

### Task 15: Template Engine

**Files:**
- Create: `src/lib/template-engine.ts`
- Test: `tests/lib/template-engine.test.ts`

- [ ] **Step 1: Write template engine tests**

```typescript
// tests/lib/template-engine.test.ts
import { describe, it, expect } from "vitest";
import { renderTemplate, extractVariables } from "@/lib/template-engine";

describe("renderTemplate", () => {
  it("replaces simple variables", () => {
    const result = renderTemplate("Hello {{guestName}}, welcome to {{property.name}}!", {
      guestName: "Sarah",
      "property.name": "Kith 1423",
    });
    expect(result).toBe("Hello Sarah, welcome to Kith 1423!");
  });

  it("leaves unknown variables as [missing]", () => {
    const result = renderTemplate("WiFi: {{property.wifiName}}", {});
    expect(result).toBe("WiFi: [missing]");
  });

  it("handles empty template", () => {
    expect(renderTemplate("", {})).toBe("");
  });
});

describe("extractVariables", () => {
  it("extracts all variable names from template", () => {
    const vars = extractVariables("{{a}} and {{b.c}} and {{d}}");
    expect(vars).toEqual(["a", "b.c", "d"]);
  });

  it("returns empty array for no variables", () => {
    expect(extractVariables("no vars here")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run tests/lib/template-engine.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement template engine**

```typescript
// src/lib/template-engine.ts

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    return variables[key] ?? "[missing]";
  });
}

export function extractVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+(?:\.\w+)*)\}\}/g);
  return [...matches].map((m) => m[1]);
}

/**
 * Build the variables map from a property + optional guest info.
 * Flattens property fields into "property.fieldName" keys.
 */
export function buildVariablesFromProperty(
  property: Record<string, unknown>,
  ownerName?: string,
  guestName?: string,
  checkinDate?: string,
  checkoutDate?: string
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Guest fields
  if (guestName) vars["guestName"] = guestName;
  if (checkinDate) vars["checkinDate"] = checkinDate;
  if (checkoutDate) vars["checkoutDate"] = checkoutDate;

  // Owner fields
  if (ownerName) vars["owner.name"] = ownerName;

  // Property fields — flatten to "property.fieldName"
  const fieldMap: Record<string, string> = {
    name: "property.name",
    addressStreet: "property.addressStreet",
    addressUnit: "property.addressUnit",
    addressCity: "property.addressCity",
    floor: "property.floor",
    wifiName: "property.wifiName",
    wifiPassword: "property.wifiPassword",
    parkingSpot: "property.parkingSpot",
    checkinTime: "property.checkinTime",
    checkoutTime: "property.checkoutTime",
    buzzerName: "property.buzzerName",
    thermostatDefault: "property.thermostat",
    hostPhone: "property.hostPhone",
    ownerPhone: "property.ownerPhone",
    slug: "property.slug",
  };

  for (const [field, varName] of Object.entries(fieldMap)) {
    const val = property[field];
    if (val != null) vars[varName] = String(val);
  }

  // Computed fields
  if (property.slug) {
    const base = process.env.NEXTAUTH_URL ?? "https://hostkit.mkgbuilds.com";
    vars["property.guideUrl"] = `${base}/g/${property.slug}`;
  }

  // Full address
  const parts = [property.addressStreet, property.addressUnit && `Unit ${property.addressUnit}`, property.addressCity, property.addressProvince, property.addressPostal].filter(Boolean);
  vars["property.addressFull"] = parts.join(", ");

  // Format times
  if (property.checkinTime) {
    vars["property.checkinTime"] = formatTime(String(property.checkinTime));
  }
  if (property.checkoutTime) {
    vars["property.checkoutTime"] = formatTime(String(property.checkoutTime));
  }

  if (property.idLeadHours != null) {
    vars["property.idLeadHours"] = String(property.idLeadHours);
  }

  return vars;
}

function formatTime(time24: string): string {
  try {
    return new Date(`2000-01-01T${time24}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time24;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run tests/lib/template-engine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/template-engine.ts tests/lib/template-engine.test.ts
git commit -m "feat: add Mustache-style template engine with variable extraction"
```

---

### Task 16: Message Generator UI

**Files:**
- Create: `src/app/(admin)/admin/properties/[id]/messages/page.tsx`, `src/components/admin/message-generator.tsx`, `src/app/api/properties/[id]/messages/route.ts`

- [ ] **Step 1: Create messages API route**

```typescript
// src/app/api/properties/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { properties, messageTemplates } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { buildVariablesFromProperty, renderTemplate } from "@/lib/template-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
    with: { owner: true },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get templates: property-specific + global
  const templates = await db.query.messageTemplates.findMany({
    where: or(
      eq(messageTemplates.propertyId, params.id),
      eq(messageTemplates.isGlobal, true)
    ),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });

  const guestName = request.nextUrl.searchParams.get("guestName") ?? "";
  const checkinDate = request.nextUrl.searchParams.get("checkinDate") ?? "";
  const checkoutDate = request.nextUrl.searchParams.get("checkoutDate") ?? "";

  const variables = buildVariablesFromProperty(
    property as unknown as Record<string, unknown>,
    property.owner.name,
    guestName,
    checkinDate,
    checkoutDate
  );

  const rendered = templates.map((t) => ({
    id: t.id,
    name: t.name,
    triggerDescription: t.triggerDescription,
    body: renderTemplate(t.bodyTemplate, variables),
    isGlobal: t.isGlobal,
  }));

  return NextResponse.json(rendered);
}
```

- [ ] **Step 2: Create message generator component**

```typescript
// src/components/admin/message-generator.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";

interface RenderedMessage {
  id: string;
  name: string;
  triggerDescription: string | null;
  body: string;
}

export function MessageGenerator({ propertyId }: { propertyId: string }) {
  const [guestName, setGuestName] = useState("");
  const [checkinDate, setCheckinDate] = useState("");
  const [checkoutDate, setCheckoutDate] = useState("");
  const [messages, setMessages] = useState<RenderedMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (guestName) params.set("guestName", guestName);
    if (checkinDate) params.set("checkinDate", checkinDate);
    if (checkoutDate) params.set("checkoutDate", checkoutDate);

    fetch(`/api/properties/${propertyId}/messages?${params}`)
      .then((r) => r.json())
      .then(setMessages);
  }, [propertyId, guestName, checkinDate, checkoutDate]);

  async function copyMessage(id: string, body: string) {
    await navigator.clipboard.writeText(body);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Guest Name</Label>
          <Input
            placeholder="e.g. Sarah"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </div>
        <div>
          <Label>Check-in Date</Label>
          <Input
            type="date"
            value={checkinDate}
            onChange={(e) => setCheckinDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Checkout Date</Label>
          <Input
            type="date"
            value={checkoutDate}
            onChange={(e) => setCheckoutDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {messages.map((msg) => (
          <Card key={msg.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{msg.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyMessage(msg.id, msg.body)}
                >
                  {copiedId === msg.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedId === msg.id ? "Copied!" : "Copy"}
                </Button>
              </div>
              {msg.triggerDescription && (
                <p className="text-xs text-muted-foreground">{msg.triggerDescription}</p>
              )}
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-slate-50 rounded-lg p-4 font-sans">
                {msg.body}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the messages page**

```typescript
// src/app/(admin)/admin/properties/[id]/messages/page.tsx
import { requireAuth } from "@/lib/auth-guard";
import { db } from "@/db";
import { properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { MessageGenerator } from "@/components/admin/message-generator";

export default async function MessagesPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });
  if (!property) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Messages</h1>
      <p className="text-muted-foreground mb-6">{property.name}</p>
      <MessageGenerator propertyId={params.id} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/properties/\[id\]/messages/ src/components/admin/message-generator.tsx src/app/\(admin\)/admin/properties/\[id\]/messages/
git commit -m "feat: add message generator with template rendering and copy-to-clipboard"
```

---

### Task 17: Turnover Checklist + History

**Files:**
- Create: `src/app/api/properties/[id]/checklist/route.ts`, `src/app/api/properties/[id]/turnovers/route.ts`, `src/app/(admin)/admin/properties/[id]/checklist/page.tsx`, `src/components/admin/turnover-checklist.tsx`, `src/app/(admin)/admin/properties/[id]/turnovers/page.tsx`

- [ ] **Step 1: Create checklist template API route**

This is the missing endpoint the `TurnoverChecklist` component needs to fetch the template.

```typescript
// src/app/api/properties/[id]/checklist/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { checklistTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET — fetch checklist template for property (property-specific first, fallback to global)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try property-specific template first
  let template = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.propertyId, params.id),
  });

  // Fall back to global template
  if (!template) {
    template = await db.query.checklistTemplates.findFirst({
      where: eq(checklistTemplates.isGlobal, true),
    });
  }

  if (!template) {
    return NextResponse.json({ error: "No checklist template found" }, { status: 404 });
  }

  return NextResponse.json(template);
}
```

- [ ] **Step 2: Create turnovers API route**

```typescript
// src/app/api/properties/[id]/turnovers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { turnovers, checklistTemplates } from "@/db/schema";
import { eq, or, isNull, desc } from "drizzle-orm";

// GET — list turnovers for property
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db.query.turnovers.findMany({
    where: eq(turnovers.propertyId, params.id),
    orderBy: [desc(turnovers.completedAt)],
  });

  return NextResponse.json(result);
}

// POST — complete a turnover
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();

  const [turnover] = await db.insert(turnovers).values({
    propertyId: params.id,
    completedBy: session.user.name ?? session.user.email ?? "Unknown",
    checklistData: body.checklistData,
    notes: body.notes,
    nextGuestCheckin: body.nextGuestCheckin ? new Date(body.nextGuestCheckin) : null,
  }).returning();

  return NextResponse.json(turnover, { status: 201 });
}
```

- [ ] **Step 2: Create interactive checklist component**

The `TurnoverChecklist` component:
1. Fetches checklist template (property-specific first, fallback to global)
2. Renders sections with checkboxes grouped by room
3. Shows deep_clean items separately with a toggle
4. Has notes textarea at bottom
5. "Mark Complete" button POSTs to turnovers API

```typescript
// src/components/admin/turnover-checklist.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface ChecklistItem {
  label: string;
  type: "check" | "restock" | "deep_clean" | "monthly";
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  sections: ChecklistSection[];
}

export function TurnoverChecklist({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showDeepClean, setShowDeepClean] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/checklist`)
      .then((r) => {
        if (!r.ok) throw new Error("No checklist template found");
        return r.json();
      })
      .then(setTemplate)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propertyId]);

  function toggleItem(sectionTitle: string, label: string) {
    const key = `${sectionTitle}:${label}`;
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleComplete() {
    setSaving(true);
    const checklistData = template?.sections.map((section) => ({
      title: section.title,
      items: section.items.map((item) => ({
        ...item,
        completed: !!checked[`${section.title}:${item.label}`],
      })),
    }));

    await fetch(`/api/properties/${propertyId}/turnovers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklistData, notes }),
    });

    router.push(`/admin/properties/${propertyId}/turnovers`);
    router.refresh();
  }

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!template) return <p className="text-muted-foreground">No checklist template available.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">{template.name}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showDeepClean}
            onChange={() => setShowDeepClean(!showDeepClean)}
          />
          Include deep clean items
        </label>
      </div>

      {template.sections.map((section) => {
        const visibleItems = section.items.filter(
          (item) => showDeepClean || item.type !== "deep_clean"
        );
        if (visibleItems.length === 0) return null;

        return (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleItems.map((item) => {
                const key = `${section.title}:${item.label}`;
                return (
                  <label key={key} className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checked[key]}
                      onChange={() => toggleItem(section.title, item.label)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm">{item.label}</span>
                    {item.type === "restock" && (
                      <Badge variant="secondary" className="text-xs">restock</Badge>
                    )}
                    {item.type === "monthly" && (
                      <Badge variant="outline" className="text-xs">monthly</Badge>
                    )}
                  </label>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div>
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any issues, restocking notes, etc."
        />
      </div>

      <Button onClick={handleComplete} disabled={saving}>
        {saving ? "Saving..." : "Mark Turnover Complete"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create checklist page and turnover history page**

Checklist page renders the `TurnoverChecklist` component.
Turnovers page lists past turnovers in a table with: date, completed by, notes, and a "View Details" expandable row.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/properties/\[id\]/checklist/ src/app/api/properties/\[id\]/turnovers/ src/components/admin/turnover-checklist.tsx src/app/\(admin\)/admin/properties/\[id\]/checklist/ src/app/\(admin\)/admin/properties/\[id\]/turnovers/
git commit -m "feat: add checklist template API, turnover checklist with completion tracking, and history log"
```

---

### Task 18: Owner Management + Remaining Admin Pages

**Files:**
- Create: `src/app/api/owners/route.ts`, `src/app/(admin)/admin/owners/page.tsx`, `src/app/(admin)/admin/owners/new/page.tsx`, `src/components/admin/owner-card.tsx`, `src/app/(admin)/admin/properties/[id]/page.tsx`, `src/app/(admin)/admin/properties/[id]/edit/page.tsx`, `src/app/(admin)/admin/properties/[id]/guide/page.tsx`, `src/app/(admin)/admin/settings/page.tsx`

- [ ] **Step 1: Create owners API route**

```typescript
// src/app/api/owners/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { owners } from "@/db/schema";
import { createOwnerSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await db.query.owners.findMany({
    with: { properties: true },
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = createOwnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [owner] = await db.insert(owners).values(parsed.data).returning();
  return NextResponse.json(owner, { status: 201 });
}
```

- [ ] **Step 2: Create owners list page + add owner form**

Owners list page: grid of owner cards showing name, email, property count, with "Add Owner" button.
Add owner form: simple form with name, email, phone, optional user linking (dropdown of existing users without owner records).

- [ ] **Step 3: Create property detail page**

Shows all property data in read-only sections. Quick action buttons (Edit, Messages, Checklist, View Guide). QR code preview.

- [ ] **Step 4: Create property edit page**

Reuses `PropertyForm` component with `initialData` and `propertyId` props. Fetches property data server-side and passes it as `initialData`. The form uses PUT instead of POST when `propertyId` is set.

```typescript
// src/app/(admin)/admin/properties/[id]/edit/page.tsx
import { db } from "@/db";
import { properties, owners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";
import { PropertyForm } from "@/components/admin/property-form";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  await requireAuth(["admin", "manager"]);
  const property = await db.query.properties.findFirst({
    where: eq(properties.id, params.id),
  });
  if (!property) notFound();
  const ownerList = await db.select({ id: owners.id, name: owners.name }).from(owners);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Edit {property.name}</h1>
      <PropertyForm
        owners={ownerList}
        initialData={property as unknown as Record<string, unknown>}
        propertyId={property.id}
      />
    </div>
  );
}
```

- [ ] **Step 5: Create guide preview page**

Shows an iframe preview of `/g/[slug]` and displays both QR codes (guide URL + WiFi). "Download QR" and "Print" buttons.

- [ ] **Step 6: Create settings page placeholder**

Basic page with user info and role display. Future: user management table for admin.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/owners/ src/app/\(admin\)/admin/owners/ src/components/admin/owner-card.tsx src/app/\(admin\)/admin/properties/\[id\]/ src/app/\(admin\)/admin/settings/
git commit -m "feat: add owner management, property detail/edit/guide preview, and settings"
```

---

## Final: Verification & Deploy Prep (Task 19)

### Task 19: Integration Test + Docker Build

- [ ] **Step 1: Run all unit tests**

```bash
pnpm test:run
```

Expected: All tests pass (schema, validators, template engine).

- [ ] **Step 2: Verify dev server renders all pages**

Check these URLs manually:
- `/login` — login page renders
- `/admin` — dashboard with stats (requires auth)
- `/admin/properties` — property grid with Kith 1423
- `/admin/properties/new` — multi-step form
- `/admin/properties/[id]/messages` — message generator
- `/admin/properties/[id]/checklist` — turnover checklist
- `/g/kith-1423` — full guest guide
- `/api/qr/kith-1423` — QR code PNG

- [ ] **Step 3: Test Docker build**

```bash
docker compose build app
```

Expected: Build succeeds with standalone output.

- [ ] **Step 4: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix lint errors and finalize MVP"
```

---

## Summary

| Chunk | Tasks | What You Get |
|-------|-------|-------------|
| **1: Foundation** | 1–6 | Scaffold, Docker, DB schema, auth, seed, admin shell |
| **2: Guest Guide** | 7–10 | Full public guest guide with all sections + QR API |
| **3: Admin CRUD** | 11–14 | Validators, property API, property list, creation form |
| **4: Operations** | 15–18 | Template engine, message generator, turnovers, owners |
| **Final** | 19 | Integration test + Docker build verification |

**Total:** 19 tasks, ~55 files, 4 test files.

---

## Cross-Cutting Concerns (Apply Throughout)

### 1. `toPascalCase` utility
The `toPascalCase` function (used for dynamic Lucide icon resolution) should be defined ONCE in `src/lib/utils.ts` and imported by `checkin-walkthrough.tsx` and `house-rules-section.tsx`. Do NOT duplicate it.

```typescript
// Add to src/lib/utils.ts
export function toPascalCase(str: string): string {
  return str.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
}
```

### 2. Guest guide font declarations
Declare `Inter` and `DM_Sans` in the root `src/app/layout.tsx` with CSS variables. The guest guide's `GuideLayout` component should reference these variables, not re-declare the fonts.

### 3. OG image generation
The file structure includes `src/app/g/[slug]/opengraph-image.tsx` but no task implements it. Add this during Task 9 Step 6 or as a follow-up. Use Next.js `ImageResponse` from `next/og` to generate a simple branded card with the property name and tagline.

### 4. Guest guide double-query
`generateMetadata` and the page component both query the same property. Wrap the query in React's `cache()` to deduplicate:

```typescript
import { cache } from "react";
const getProperty = cache(async (slug: string) => {
  return db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    with: { owner: true },
  });
});
```

### 5. `NearbyServices` key stability
Use `svc.name + svc.category` as React key instead of array index to prevent flicker on category tab switches.
