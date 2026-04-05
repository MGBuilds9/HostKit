# HostKit UI Overhaul & Performance Enhancement — Reviewed Plan

## Context

Six Jules PRs (#1-#6) identified real UI/perf improvements but all had compile-breaking bugs.
This plan captures their intent and implements correctly in three phases. Reviewed by CEO,
Design, and Eng voices — all critical findings incorporated.

**User decision:** Execute all 3 phases (overriding CEO recommendation to defer Phases 2-3).

---

## Phase 1: Design Tokens & Typography

**Goal:** Tighten dark mode contrast, heading hierarchy, touch-target utility.
**Files:** `src/app/globals.css`, `tailwind.config.ts`

### 1.1 Dark Mode Contrast (globals.css)

Edit `.dark` section only. Preserve ALL existing variables and `@tailwind` directives.

| Variable | Current | New | Rationale |
|----------|---------|-----|-----------|
| `--border` | `217.2 32.6% 17.5%` | `217.2 32.6% 22%` | Borders invisible at 17.5% |
| `--muted-foreground` | `215 20.2% 65.1%` | `215 20.2% 70%` | WCAG AA contrast |
| `--card` | `222.2 84% 4.9%` | `224 20% 8%` | Cards indistinguishable from bg |
| `--accent` | `217.2 32.6% 17.5%` | `217.2 32.6% 20%` | Separation from border (NOT 14% — fails WCAG) |

Do NOT touch: `@tailwind` directives, `* { @apply border-border }`, `body { @apply ... }`, any `--guest-*` vars.

### 1.2 Heading Typography Scale (globals.css)

Add to existing `@layer base` block (do NOT create a new one):

```css
h1 { @apply text-3xl font-bold tracking-tight; }
h2 { @apply text-2xl font-semibold tracking-tight; }
h3 { @apply text-xl font-semibold; }
h4 { @apply text-lg font-medium; }
```

### 1.3 Touch Target Utility (globals.css)

```css
.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

### 1.4 Tailwind Font Config (tailwind.config.ts)

**IMPORTANT:** `layout.tsx` already imports Inter + DM_Sans and sets `--font-inter`. Do NOT touch layout.tsx.

Only extend tailwind.config.ts to use the existing CSS variable:

```ts
import defaultTheme from 'tailwindcss/defaultTheme'
// ... in theme.extend:
fontFamily: {
  sans: ['var(--font-inter)', ...defaultTheme.fontFamily.sans],
}
```

Note: Must add the `defaultTheme` import — currently missing.

### 1.5 Verification
- `npx tsc --noEmit` passes
- `pnpm build` succeeds

---

## Phase 2: Component & Guest Guide Polish

**Goal:** Refine UI components, strengthen coral accent in guest guide, fix a11y gaps.

### 2.1 Button (src/components/ui/button.tsx)

**Verify first:** `transition-colors` and `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` already exist in base classes.
- Only ADD: `touch-target` class to `default` size variant (the one with `h-10`)
- Do NOT duplicate existing transitions or focus rings

### 2.2 Badge (src/components/ui/badge.tsx)

- Change `focus:ring-2` to `focus-visible:ring-2` (semantic behavior change — focus-visible only fires on keyboard, not mouse)
- Verify `transition-colors` is present before adding

### 2.3 Input (src/components/ui/input.tsx)

- ADD `touch-target` class
- ADD `disabled:pointer-events-none` (not currently present)
- Verify focus ring already exists before adding

### 2.4 Guest Guide Coral Accent (src/components/guest/)

**CORRECT PATH: `src/components/guest/` NOT `src/components/guest-guide/`**

| Component | Change |
|-----------|--------|
| `hero-section.tsx` | Add coral accent to property name (h1) or decorative line |
| `sticky-bottom-bar.tsx` | Change primary CTA from `bg-foreground` to `bg-[hsl(var(--guest-accent))]` |
| `house-rules-section.tsx` | Rule icons/bullets use `text-[hsl(var(--guest-accent))]` |
| `amenities-section.tsx` | Category headers use coral accent underline or left border |

**SKIP `checkin-walkthrough.tsx` step indicators** — already uses `--guest-accent` extensively (icon bg, stroke, pagination dot).

### 2.5 Checkin Walkthrough a11y Fix (src/components/guest/checkin-walkthrough.tsx)

Add `aria-label` to navigation buttons:
- Previous: `aria-label="Previous step"`
- Next: `aria-label={`Next step (${current + 2} of ${steps.length})`}`

### 2.6 Verification
- `npx tsc --noEmit` passes
- `pnpm build` succeeds
- Visually verify: coral accent is consistent thread through guest guide sections

---

## Phase 3: Performance

**Goal:** Memoize expensive render paths, slim API payloads.

### 3.1 React.memo on Calendar Components

**CORRECT PATHS:**
- `src/components/admin/calendar/property-calendar-row.tsx` — uses `"use client"` + useState. Wrap with `React.memo()`.
- `src/components/admin/calendar/calendar-toolbar.tsx` — uses named export. Apply: `export const CalendarToolbar = React.memo(function CalendarToolbar(...){...})`

**REMOVED:** `turnover-filters.tsx` — it's a Server Component (no `"use client"`). React.memo is meaningless on RSCs.

### 3.2 useMemo for Multi-Property Calendar

`src/components/admin/calendar/multi-property-calendar.tsx` — memoize computed date range and filtered property list where computation is non-trivial.

### 3.3 Lazy Load Framer Motion — REMOVED

Framer-motion is only imported in `src/components/guest/checkin-walkthrough.tsx` (the guest guide). The plan explicitly says NOT to lazy-load guest guide components (above the fold, SSR). No admin components import framer-motion. **This phase item is a no-op. Removed from scope.**

### 3.4 API Payload — RETARGETED

**CRITICAL CORRECTION:** The admin properties list page (`src/app/(admin)/admin/properties/page.tsx`) queries the DB directly with Drizzle — it does NOT call `/api/properties`. The API route serves the owner portal.

**New target:** Audit `/api/properties/route.ts` to confirm what fields owner portal consumers actually read. If the owner portal only needs a subset, apply field projection with `db.select()` using proper Drizzle join syntax (NOT inline subqueries). If the owner portal reads the full object, skip this optimization.

**Before changing the API shape:** grep all `fetch('/api/properties')` or `fetch(\`/api/properties\`)` calls to identify all consumers and their field usage.

### 3.5 Verification
- `npx tsc --noEmit` passes
- `pnpm build` succeeds
- `pnpm test` passes
- Calendar still renders correctly with memoized rows

---

## Commit Strategy

Three atomic commits:
1. `Tighten dark mode contrast, extend tailwind font config, add heading scale and touch-target`
2. `Refine button/badge/input components, strengthen guest guide coral accent, fix checkin a11y`
3. `Memoize calendar components, audit properties API payload`

Each must pass `tsc --noEmit` and `pnpm build` before proceeding.

---

## Out of Scope
- Migrating admin pages from `"use client"` to RSC
- Rate limiting on API routes
- Timezone hardcoding fix
- First-user admin race condition
- Adding new shadcn components
- Guest guide Suspense streaming
- Framer-motion lazy loading (no eligible candidates found)
- Loading/empty/error state specifications (not in original Jules PR intents)

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale |
|---|-------|----------|---------------|-----------|-----------|
| 1 | CEO | Proceed with all 3 phases despite strategic concerns | User Override | — | User explicitly chose to execute all phases |
| 2 | Design | Fix `--accent` from 14% to 20% | Mechanical | P1 (completeness) | 14% fails WCAG 3:1 contrast |
| 3 | Design | Remove checkin-walkthrough from coral accent list | Mechanical | P4 (DRY) | Already uses --guest-accent extensively |
| 4 | Design | Add aria-labels to checkin nav buttons | Mechanical | P1 (completeness) | Screen readers announce "button, button" |
| 5 | Design | Mark button focus-ring as verify-only | Mechanical | P4 (DRY) | Already exists in base classes |
| 6 | Eng | Skip font import in layout.tsx | Mechanical | P4 (DRY) | Already imported |
| 7 | Eng | Add defaultTheme import to tailwind config | Mechanical | P5 (explicit) | Required for fontFamily spread |
| 8 | Eng | Remove framer-motion lazy loading entirely | Mechanical | P3 (pragmatic) | No eligible candidates exist |
| 9 | Eng | Remove turnover-filters from memo targets | Mechanical | P5 (explicit) | RSC can't be memoized |
| 10 | Eng | Fix all component paths (add admin/ prefix) | Mechanical | P5 (explicit) | Paths in plan were wrong |
| 11 | Eng | Retarget API optimization from route to DB query audit | Mechanical | P3 (pragmatic) | Admin page doesn't call the API route |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | issues_open | 6/6 dimensions flagged. User overrode: proceed all 3 phases |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | 7 findings, all resolved in plan |
| Eng Review | `/plan-eng-review` | Architecture & tests | 1 | clean | 8 findings, all resolved in plan |
| DX Review | `/plan-devex-review` | Developer experience | 0 | skipped | No developer-facing scope |

**VERDICT:** REVIEWED — 3 critical bugs caught (wrong paths, duplicate font import, nonexistent lazy-load targets), 4 high-severity issues fixed. Plan is now implementation-ready.
