# CLAUDE.md — Project context for Claude Code

> Claude Code auto-loads this file on every session start. It's the persistent context for AI agents working on this project. Keep it terse, accurate, and load-bearing.

---

## Project identity

**Finance Tracker** — single-user personal finance dashboard for Rayan Karim Checa. Manual transaction tracking, budgets, savings goals, net worth snapshots, NYC lease overhang tracker, 2025 tax estimator, recurring bills, CSV/XLSX import-export. Target deployment: `finance.rayancheca.com` on Vercel.

**Repo:** `github.com/rayancheca/finance-tracker-` · **Default branch:** `main`

## Tech stack (LOCKED — do not substitute)

Next.js 15 (App Router) · TypeScript `strict: true` · Node 20 · Tailwind 3.4 · shadcn-style UI (Radix, written inline in `src/components/ui/`) · lucide-react · Recharts 2 · Drizzle ORM · Neon Postgres (`@neondatabase/serverless`) · Clerk auth · React Hook Form + Zod · date-fns 3 · papaparse · exceljs · sonner · next-themes · canvas-confetti · @dnd-kit · nuqs · Vitest + Playwright · ESLint + Prettier.

**Do not introduce:** Prisma, tRPC, TanStack Query, MUI/Chakra/Mantine, NextAuth/Auth0, Redux/Zustand. The original spec was explicit. If you think you need one, stop and ask.

## Where to find things

| Concern | File |
| --- | --- |
| DB schema (12 tables, 9 enums) | `src/db/schema.ts` |
| Drizzle client | `src/db/index.ts` |
| Read queries (server components call these) | `src/db/queries.ts` |
| Seed data (5 accounts, 46 categories, 6 goals, 24 settings) | `src/db/seed.ts` |
| Auth helpers (`requireUser`, `ensureUserProvisioned`) | `src/lib/auth.ts` |
| Validators + `SETTINGS_SCHEMA` + defaults | `src/lib/validators.ts` |
| Tax estimator (2025 federal brackets + FICA + state) | `src/lib/tax.ts` |
| NYC lease overhang math | `src/lib/lease.ts` |
| USD / percent formatting | `src/lib/currency.ts` |
| date-fns wrappers | `src/lib/dates.ts` |
| CSV helpers (papaparse) | `src/lib/csv.ts` |
| AES-256-GCM encryption (Phase 11.5 tokens) | `src/lib/crypto.ts` |
| `cn()` classname merger | `src/lib/utils.ts` |
| Server actions (one file per resource) | `src/actions/*.ts` |
| Clerk middleware (protects all non-public routes) | `middleware.ts` |
| Auth pages (Clerk sign-in / sign-up) | `src/app/(auth)/` |
| Protected app pages | `src/app/(app)/` |
| Export endpoints (CSV / XLSX) | `src/app/api/export/{csv,xlsx}/route.ts` |
| Page-by-page reference | `README.md` § 13 |
| Phase-by-phase delivery state | `BUILD_LOG.md` |
| Handoff context for a fresh Claude on another machine | `CONTINUE.md` |

## How the layers connect

```
Browser → /sign-in (Clerk)
         ↓ (signed in)
middleware.ts → auth.protect()
         ↓
src/app/(app)/layout.tsx → ensureUserProvisioned()
         ↓ first time only: seedNewUser(userId) → 5 accounts / 46 categories / 6 goals / 24 settings
         ↓
<page>.tsx (server component) → requireUser() → src/db/queries.ts (filters by userId)
         ↓
React UI → forms in 'use client' components → server actions in src/actions/*.ts
         ↓
Server action: requireUser() → validate via src/lib/validators.ts → db ops scoped by userId → revalidatePath()
```

**The invariants that make this safe:**

1. **Every server action** calls `requireUser()` as its first statement.
2. **Every DB query** filters by `userId`. There is no global access path.
3. **All amounts** stored as `numeric(14, 2)` (Drizzle returns strings). Convert at display via `src/lib/currency.ts`.
4. **Transaction amounts are positive in storage.** The `type` enum (`income` / `expense` / `transfer`) determines sign at display.
5. **All input validation** flows through Zod schemas in `src/lib/validators.ts`. Shared between client (forms) and server (actions).
6. **Server actions return `{ ok: true, data }` or `{ ok: false, error: string }`.** Never throw across the boundary.
7. **Settings keys** must exist in `SETTINGS_SCHEMA`. Adding one requires adding the schema entry AND the default in `SETTINGS_DEFAULTS`.

## Current delivery state

✅ Phases 0–13 of the original spec are in code (Bootstrap, DB, Auth, Layout, Accounts, Categories, Transactions, CSV Import, Tax, Goals, Net Worth, Recurring & Lease, Reports, Dashboard).
✅ Local `npm run build` / `typecheck` / `lint` / `test` all clean. 43/43 unit tests pass.
🚧 Phase 11.5 (Plaid + SnapTrade SDK glue): schema + crypto + `/connections` shell in. SDK integration deferred — needs API keys.
🚧 Playwright e2e tests: config installed, no `.spec.ts` files yet.
🚧 UX polish: drag-reorder categories, inline category-edit on tx table, bulk-select checkboxes on tx list.
🚧 Deploy: requires user's Vercel + Neon + Clerk credentials. Not done.

Full status: `BUILD_LOG.md`.

## Scripts

```bash
npm run dev          # dev server at :3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright
npm run db:push      # push schema to Neon
npm run db:studio    # visual DB browser
npm run db:seed <id> # manually re-seed a user
```

**Before pushing anything,** run: `npm run typecheck && npm run lint && npm run test`. All three must be clean.

## Environment variables

The minimum for v1 to boot:

- `DATABASE_URL` — Neon Postgres connection string (`?sslmode=require`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk dashboard
- `CLERK_SECRET_KEY` — Clerk dashboard

Plus the Clerk URL paths and `NEXT_PUBLIC_APP_URL` — all in `.env.example`.

Phase 11.5 adds: `PLAID_*`, `SNAPTRADE_*`, `ENCRYPTION_KEY` (`openssl rand -base64 32`), `CRON_SECRET`.

## To-do list (prioritized)

### P1 — High value, no external dependencies

1. **Playwright e2e tests** (`tests/e2e/*.spec.ts`). At minimum: auth, transactions CRUD, dashboard render, settings → tax-calc reflection, goals contribute+complete, CSV import smoke test. Needs `@clerk/testing` test-mode credentials (already in `devDependencies`).
2. **UX polish:**
   - Drag-to-reorder on `/categories` (server action `reorderCategories` exists; wire `@dnd-kit/sortable`).
   - Inline category-edit dropdown on the transactions table.
   - Bulk-select checkboxes + bulk-actions toolbar on `/transactions` (server actions `bulkDeleteTransactions`, `bulkUpdateCategory`, `bulkSetCleared` exist).
3. **CSV import improvements:** auto-categorize by past-merchant heuristic; better date-format detection.
4. **Account detail drill-in page** (`/accounts/[id]`) showing recent transactions + balance trend.
5. **Empty-state illustrations** on every list page (currently text-only).

### P2 — Phase 11.5 (needs Plaid + SnapTrade API keys from user)

See `README.md` § 16 for the full deferred work list. Don't start unless the user has provisioned credentials.

### P3 — Nice-to-haves from the original spec

- Goal contribution can optionally create a savings transaction (currently doesn't).
- "Post Due Today" action on `/recurring` for entries with `autoPost = true`.
- Lease "what-if release on date X" interactive picker on `/lease`.
- Tax calculator: bracket bar visualization, "save settings" diff preview.
- Reports: heatmap conditional formatting on the monthly pivot; year-over-year comparison row on annual report.

## How to verify the app actually works

Cannot be done end-to-end without live Neon + Clerk credentials. But you can:

1. Run unit tests: `npm run test`.
2. Build: `npm run build` (use placeholder env vars if `.env.local` isn't set up:
   `DATABASE_URL="postgres://x:x@localhost:5432/x" NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_cGxhY2Vob2xkZXIuY2xlcmsuYWNjb3VudHMuZGV2JA==" CLERK_SECRET_KEY="sk_test_placeholderplaceholderplaceholder" npm run build`).
3. With real `.env.local`: `npm run db:push && npm run dev` → http://localhost:3000.

## Anti-patterns (the things that have bitten this codebase or are likely to)

- **Adding `any`.** Use `unknown` + a type guard, or define the type.
- **Skipping `requireUser()`** on a new server action. Even "harmless" reads must be userId-scoped.
- **Forgetting `revalidatePath()`** after a mutation — the UI won't update.
- **Storing negative amounts.** Always positive; sign is implied by `type`.
- **Inventing new settings keys** without updating `SETTINGS_SCHEMA` and `SETTINGS_DEFAULTS`.
- **Inline styles or one-off CSS.** Use Tailwind classes + the existing CSS variables.
- **Updating `transactionInputSchema.partial()`** — the schema has a `.superRefine`, so `.partial()` doesn't work on it. Use the separate `transactionPatchSchema` (already exported).
- **Pushing to `main` without explicit user permission** when the change is non-trivial. Open a PR.
- **Leaving `console.log` in committed code.**
- **Creating files just to "document the work"** (analysis docs, planning files). Work from conversation + BUILD_LOG.

## Conventions for working

- Default to **server components**. Only `'use client'` when you need hooks or browser APIs.
- Forms live in client components; submission calls server actions.
- Read queries go in `src/db/queries.ts`. Mutations go in `src/actions/*.ts`.
- Use `cn()` from `@/lib/utils` to merge Tailwind classes conditionally.
- Use `formatUSD()` / `formatPercent()` / `formatSignedUSD()` from `@/lib/currency` — never `Intl.NumberFormat` inline.
- New shadcn-style components go in `src/components/ui/`. They use Radix primitives. Match the existing patterns (forwardRef, displayName, cva variants where appropriate).

## When in doubt

Ask the user. The original spec was explicit about "stop, explain, ask" over silent design changes. Same applies now.

---

**Last updated:** initial commit by Claude on `27c7c03`. Update this file when conventions or to-do priorities change.
