# HostKit — Technical Architecture Blueprint

> Generated: 2026-03-14
> Source: HOSTKIT-PRD.md

---

## Part 0: Classification & Assumptions

**Project Type:** Web App / SaaS
**Design Archetype:** Internal Tool (Admin) + Marketing Site (Guest Guide) — Dual personality: data-dense admin for Mariam, premium mobile concierge for guests

| Assumption | Rationale |
|------------|-----------|
| Self-hosted on mkgbuilds Proxmox (192.168.0.19) | Michael has Docker infra + Nginx Proxy Manager already running |
| Mariam is the primary admin user | She manages 10+ properties across multiple owners |
| Guests access via shareable link/QR — no app install | Maximum accessibility, zero friction |
| PostgreSQL over managed DB | LAN-direct is faster, no egress costs, full control |
| Single-tenant deployment | One PM (Mariam), not multi-tenant SaaS |
| pnpm as package manager | Per PRD instruction |
| Next.js 14 (not 15) | PRD specifies 14; App Router with stable APIs |

**Identified Risks:**

| Risk | Severity | Mitigation |
|------|----------|------------|
| NextAuth v5 is beta | Medium | Pin exact version, test auth flows thoroughly. Fallback: downgrade to v4 stable |
| jsonb columns lose type safety at DB level | Low | Zod validation on all write paths; Drizzle `$type<>` for read-side types |
| No image upload in MVP | Low | Defer to Phase 5; use text descriptions for now |
| WiFi passwords stored in plaintext | Medium | Acceptable for self-hosted LAN. Add encryption column if ever exposed publicly |
| Single Docker host = SPOF | Low | Proxmox snapshots + daily PG backup cron |
| Guest guide is public — no rate limiting | Medium | Add basic rate limiting middleware or Nginx-level throttling |

---

## Part 1: Foundation

**Core Function:** Self-hosted property management toolkit that lets a property manager onboard Airbnb properties and generate premium guest-facing digital concierge guides via shareable links.

**Success Metrics:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Property onboarding time | < 15 minutes | Time from "New Property" click to published guest guide |
| Guest guide load time (mobile) | < 2s TTFB | Lighthouse / WebPageTest |
| Message generation time | < 10 seconds | Click property → copy all 7 messages |
| Turnover completion tracking | 100% logged | Every turnover has a completed checklist record |

**User Personas:**

| Type | Need | Primary Action |
|------|------|----------------|
| Mariam (Property Manager) | Manage 10+ properties, onboard fast, generate guest comms, track turnovers | Admin dashboard: create properties, generate messages, complete checklists |
| Guest | Smooth check-in, find WiFi/parking/amenities, feel premium | View mobile guest guide via link or QR code |
| Owner | Visibility into their properties | Read-only portal: view properties, guides, turnover history |
| MG (Admin) | System oversight, user management | Full admin access + settings |

**Positioning:** "The property manager's toolkit — onboard properties in minutes, impress guests in seconds."

---

## Part 2: Tech Stack (Cost-Optimized)

| Layer | Recommended | Alt 1 | Alt 2 (Self-Hosted) |
|-------|-------------|-------|---------------------|
| **Framework** | Next.js 14 (App Router) | Remix | Astro + React islands |
| **Database** | PostgreSQL 16 (Docker Alpine) | SQLite (Turso) | Pocketbase |
| **ORM** | Drizzle ORM | Prisma | Kysely |
| **Auth** | NextAuth.js v5 (Google OAuth) | Lucia Auth | Auth.js v4 stable |
| **UI Components** | shadcn/ui + Radix | Mantine | Ark UI |
| **Styling** | Tailwind CSS 3.4 | Tailwind 4 | CSS Modules |
| **Animations** | Framer Motion | Motion One | CSS transitions only |
| **Icons** | Lucide React | Phosphor Icons | Heroicons |
| **QR Codes** | `qrcode` npm | `qr-image` | `react-qr-code` |
| **Maps** | Google Maps Embed (free) | Leaflet + OpenStreetMap | MapLibre GL |
| **Hosting** | Docker Compose (self-hosted) | Coolify (self-hosted PaaS) | Vercel (free tier) |
| **Reverse Proxy** | Nginx Proxy Manager (existing) | Caddy | Traefik |
| **Package Manager** | pnpm | npm | yarn |

**Monthly Cost Estimate:**

| Component | Cost |
|-----------|------|
| Docker containers (self-hosted) | $0 |
| PostgreSQL (self-hosted) | $0 |
| Nginx Proxy Manager (existing) | $0 |
| Let's Encrypt SSL | $0 |
| Google OAuth | $0 |
| Google Maps Embed (free tier) | $0 |
| Domain (mkgbuilds.com subdomain) | $0 (existing) |
| **Total** | **$0/month** |

---

## Part 3: Design System

### Admin Dashboard — "Efficient Clarity"

```css
/* Admin theme — shadcn/ui defaults with warm neutral */
--background: #FFFFFF;
--foreground: #0F172A;
--card: #FFFFFF;
--card-foreground: #0F172A;
--primary: #0F172A;
--primary-foreground: #F8FAFC;
--secondary: #F1F5F9;
--secondary-foreground: #0F172A;
--muted: #F1F5F9;
--muted-foreground: #64748B;
--accent: #F1F5F9;
--accent-foreground: #0F172A;
--destructive: #EF4444;
--border: #E2E8F0;
--ring: #0F172A;
--radius: 0.5rem;
```

**Typography (Admin):**
- Body: Inter, 400, 14px
- Headings: Inter, 600
- Mono: JetBrains Mono (code/template editing)

### Guest Guide — "Premium Concierge"

```css
/* Guest theme — warm, inviting, app-like */
--primary: #FF6B6B;          /* Warm coral — CTAs, interactive elements */
--primary-hover: #FF5252;
--background: #FFFFFF;
--surface: #F9FAFB;          /* Subtle warm gray sections */
--text-primary: #1A1A2E;     /* Deep navy-black */
--text-secondary: #6B7280;   /* Muted gray */
--text-muted: #9CA3AF;
--success: #10B981;          /* Copied! toast, completed steps */
--error: #EF4444;            /* Emergency, SOS */
--warning: #F59E0B;
--border: #E5E7EB;
--card-shadow: 0 1px 3px rgba(0,0,0,0.08);
--radius: 12px;              /* Rounded, friendly */
```

**Typography (Guest):**
- Body: Inter, 400, 16px (mobile-optimized)
- Headings: DM Sans, 600
- Mono: N/A

**Spacing:** 4px base grid
**Radius:** Admin: `rounded-lg` (8px) | Guest: `rounded-xl` (12px)

**Signature Element:** Swipeable check-in walkthrough with progress dots — the "wow" moment that makes guests feel this is a premium experience.

**Tailwind Components:**

```
/* Admin */
Button Primary:   bg-slate-900 text-white hover:bg-slate-800 rounded-lg px-4 py-2 text-sm font-medium
Button Secondary: bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg px-4 py-2 text-sm
Card:             bg-white border border-slate-200 rounded-lg p-6 shadow-sm
Input:            border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900

/* Guest Guide */
Button Primary:   bg-[#FF6B6B] text-white hover:bg-[#FF5252] rounded-xl px-6 py-3 text-base font-medium shadow-sm
Card:             bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]
Section:          bg-[#F9FAFB] rounded-2xl p-6
WiFi Copy Button: bg-[#FF6B6B]/10 text-[#FF6B6B] rounded-lg px-4 py-2 font-medium hover:bg-[#FF6B6B]/20
Sticky Bar:       fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-4 py-3 flex gap-3
```

---

## Part 4: Information Architecture

```
/
├── (auth)/
│   └── login/                          # Google OAuth login
│
├── (admin)/                            # Protected — role-gated
│   └── admin/
│       ├── /                           # Dashboard — property overview cards + stats
│       ├── properties/
│       │   ├── /                       # Property grid (cards)
│       │   ├── new/                    # Multi-step creation form (5 steps)
│       │   └── [id]/
│       │       ├── /                   # Property detail view
│       │       ├── edit/               # Edit property (same form, pre-filled)
│       │       ├── messages/           # Message generator (7 templates, copy)
│       │       ├── checklist/          # Interactive turnover checklist
│       │       ├── turnovers/          # Turnover history log
│       │       └── guide/              # Guest guide preview + QR codes
│       │
│       ├── owners/
│       │   ├── /                       # Owner list (admin/manager only)
│       │   └── new/                    # Add owner form
│       │
│       ├── templates/
│       │   ├── /                       # Global message template editor
│       │   └── checklist/              # Global checklist template editor
│       │
│       └── settings/                   # User management, preferences
│
├── g/                                  # PUBLIC — no auth
│   └── [slug]/                         # Guest guide (SSR, mobile-first)
│
└── api/
    ├── auth/[...nextauth]/             # NextAuth handler
    ├── properties/                     # CRUD
    ├── properties/[id]/
    ├── properties/[id]/messages/       # Generate pre-filled messages
    ├── properties/[id]/turnovers/      # Turnover CRUD
    ├── owners/                         # CRUD
    ├── templates/                      # Template CRUD
    └── qr/[slug]/                      # QR code PNG generation (?type=wifi)
```

**Nav Logic:**
- **Admin:** Collapsible left sidebar (Dashboard, Properties, Owners, Templates, Settings)
- **Guest:** No navigation — immersive single-page scroll with sticky bottom bar
- **Auth gates:** All `/admin/*` routes protected by NextAuth middleware; role filtering (owner sees only their properties)
- **Public:** `/g/*` and `/api/qr/*` are unauthenticated

---

## Part 5: Data Layer

### Drizzle ORM Schema (PostgreSQL 16)

Full schema defined in PRD (`src/db/schema.ts`). Key tables:

| Table | Purpose | RLS Equivalent |
|-------|---------|----------------|
| `users` | NextAuth-managed accounts + role | App-level: middleware checks `session.user.role` |
| `owners` | Property owners linked to user accounts | App-level: owners see only `owners.userId = session.user.id` |
| `properties` | Core property data (all fields) | App-level: filter by `owner.userId` for owner role |
| `message_templates` | Mustache-style templates (global + per-property) | App-level: all authenticated users can read |
| `checklist_templates` | Turnover checklist definitions | App-level: all authenticated users can read |
| `turnovers` | Completed turnover records | App-level: filter by property ownership for owner role |

**Note:** No Supabase RLS — access control is handled in Next.js API routes and middleware since this is a direct PG connection via Drizzle. Every API route validates:
1. Session exists (NextAuth)
2. User role permits the action
3. For owners: resource belongs to their properties

### Migrations

```bash
# Push schema changes to database
pnpm drizzle-kit push

# Generate migration SQL (for version control)
pnpm drizzle-kit generate

# Seed initial data
pnpm tsx src/db/seed.ts
```

### Backup Strategy

```bash
# Daily PG dump via cron on Proxmox host
0 3 * * * docker exec hostkit-db-1 pg_dump -U hostkit hostkit | gzip > /zfs-db/backups/hostkit/hostkit-$(date +\%Y\%m\%d).sql.gz

# Retain 30 days
find /zfs-db/backups/hostkit/ -name "*.sql.gz" -mtime +30 -delete
```

---

## Part 6: Integrations

| Service | Purpose | Free Tier Limit | Env Var |
|---------|---------|-----------------|---------|
| Google OAuth | Admin authentication | Unlimited | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Google Maps Embed | Property location + nearby directions | Unlimited (embed mode) | `GOOGLE_MAPS_API_KEY` (optional) |
| Let's Encrypt | SSL via Nginx Proxy Manager | Unlimited | N/A (auto-managed) |
| Google Fonts | DM Sans + Inter | Unlimited | N/A (CDN) |

**Error Handling:**

| Failure Point | Detection | User Feedback | Recovery |
|---------------|-----------|---------------|----------|
| DB connection lost | Drizzle connection error | Admin: "Database unavailable" banner | Docker restart policy: `unless-stopped` |
| Google OAuth down | NextAuth callback error | "Login temporarily unavailable" | Retry; credentials fallback if configured |
| Guest guide 404 (bad slug) | DB query returns null | Friendly 404: "This guide doesn't exist" | Suggest contacting host |
| QR generation fails | `qrcode` lib error | Fallback: display URL as plain text | Log error, serve text URL |
| Template variable missing | Mustache render returns empty | Show `[missing]` placeholder | Admin sees warning in preview |

---

## Part 7: Assets Checklist

| Asset | Status | Notes |
|-------|--------|-------|
| Google OAuth credentials | ⬜ | Create at console.cloud.google.com, set redirect to `hostkit.mkgbuilds.com/api/auth/callback/google` |
| Google Maps API key | ⬜ | Optional — embed mode works without key for basic maps |
| Domain DNS | ⬜ | Add `hostkit.mkgbuilds.com` A record → Proxmox IP, configure in NPM |
| Fonts | ✅ | DM Sans + Inter from Google Fonts (CDN, no setup) |
| Icons | ✅ | Lucide React (npm package, tree-shakeable) |
| Seed data | ✅ | Kith 1423 fully defined in PRD |
| Docker host | ✅ | mkgbuilds Proxmox (192.168.0.19) |
| Nginx Proxy Manager | ✅ | Already running |
| SSL certificate | ⬜ | Auto-provisioned by NPM + Let's Encrypt on first deploy |
| `.env` file | ⬜ | Generate `DB_PASSWORD` + `NEXTAUTH_SECRET`, add OAuth creds |

---

## Part 8: V2 Backlog

- n8n webhook integration for turnover notifications (Slack/email)
- Guest guide page view analytics (lightweight, privacy-respecting)
- Image upload per property (parking map, unit photos)
- Print-friendly turnover checklist (PDF export)
- Multi-language guest guide support (i18n)
- Property cloning (duplicate an existing property as template)
- Bulk nearby services import (CSV/Google Places API)
- Custom guest guide themes per property (color/font overrides)
- Guest feedback form (post-checkout survey)
- Calendar integration (iCal sync with Airbnb for auto check-in dates)
- Mobile PWA for admin (offline checklist completion)

---

## Architecture Diagram

```
                        ┌──────────────────────────────┐
                        │     Nginx Proxy Manager      │
                        │   hostkit.mkgbuilds.com       │
                        │   SSL (Let's Encrypt)         │
                        └──────────┬───────────────────┘
                                   │ :443 → :3100
                        ┌──────────▼───────────────────┐
                        │     Docker Compose Stack      │
                        │                               │
                        │  ┌─────────────────────────┐  │
                        │  │   Next.js 14 App (:3000) │  │
                        │  │                          │  │
                        │  │  ┌── Admin (SSR+CSR) ──┐ │  │
                        │  │  │  Dashboard           │ │  │
                        │  │  │  Properties CRUD     │ │  │
                        │  │  │  Message Generator   │ │  │
                        │  │  │  Turnover Checklists │ │  │
                        │  │  └──────────────────────┘ │  │
                        │  │                          │  │
                        │  │  ┌── Guest Guide (SSR) ─┐ │  │
                        │  │  │  /g/[slug]           │ │  │
                        │  │  │  Mobile-first        │ │  │
                        │  │  │  QR + WiFi QR        │ │  │
                        │  │  └──────────────────────┘ │  │
                        │  │                          │  │
                        │  │  ┌── API Routes ────────┐ │  │
                        │  │  │  NextAuth (Google)   │ │  │
                        │  │  │  Properties API      │ │  │
                        │  │  │  Templates API       │ │  │
                        │  │  │  QR Generation       │ │  │
                        │  │  └──────────────────────┘ │  │
                        │  └──────────┬───────────────┘  │
                        │             │                   │
                        │  ┌──────────▼───────────────┐  │
                        │  │  PostgreSQL 16 (:5432)    │  │
                        │  │  hostkit database         │  │
                        │  │  Volume: hostkit_pgdata   │  │
                        │  └──────────────────────────┘  │
                        └──────────────────────────────┘
                                   │
                        ┌──────────▼───────────────────┐
                        │   ZFS Backups (Proxmox)       │
                        │   /zfs-db/backups/hostkit/     │
                        │   Daily pg_dump, 30-day retain │
                        └──────────────────────────────┘
```

---

## Implementation Sequence

| Phase | What | Depends On | Estimated Complexity |
|-------|------|------------|---------------------|
| **1. Foundation** | Scaffold, Docker, schema, auth, seed, admin layout | Nothing | Medium |
| **2. Guest Guide** | `/g/[slug]` SSR page, all sections, QR API | Phase 1 (schema + seed) |  High (most UI work) |
| **3. Admin CRUD** | Property list/create/edit, owner management, roles | Phase 1 (auth + schema) | Medium-High |
| **4. Messages & Turnovers** | Template engine, message generator, checklists, history | Phase 3 (properties exist) | Medium |
| **5. Polish** | n8n hooks, analytics, image upload, print view | Phase 4 | Low-Medium |

---

## Validation Checklist

- [x] Project type classified (Web App) and design archetype assigned (dual: Internal Tool + Premium Concierge)
- [x] Tech stack prioritizes self-hosted with alternatives listed
- [x] Design system specific to domain — admin uses shadcn defaults, guest guide uses warm coral premium aesthetic
- [x] Database schema validated with typed jsonb columns + Zod validation layer
- [x] Monthly cost estimate provided ($0/month — fully self-hosted)
- [x] Assumptions and risks documented with mitigations
- [x] Route structure defined with auth gates (middleware + role checks)
- [x] Backup strategy defined (daily pg_dump to ZFS)
- [x] Error handling matrix documented
- [x] Implementation sequence with dependency chain
