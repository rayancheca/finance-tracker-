# Continuation prompt — Finance Tracker

> **How to use this file:** When you start a new Claude session (Claude Code, Claude on the web, etc.) on a different machine, paste the entire contents of this file as your first message. It briefs the new Claude on what's been built, what's left, and the conventions to follow.

---

## You're continuing work on a project. Read this carefully before doing anything.

### Project

A single-user personal finance dashboard for Rayan Karim Checa, built per a detailed spec (the original spec exists as a long markdown document that started this build; the salient state is below). Repo: `rayancheca/finance-tracker-` on GitHub. Production target: `finance.rayancheca.com` on Vercel.

### Tech stack (locked — do not substitute)

Next.js 15 (App Router) · TypeScript (`strict: true`) · Tailwind CSS · shadcn-style UI components (Radix-based, written inline in `src/components/ui/`) · Drizzle ORM · Neon Postgres · Clerk auth · React Hook Form + Zod · Recharts · date-fns · papaparse · exceljs · sonner · Vitest + Playwright · ESLint + Prettier.

Deliberately NOT used: Prisma, tRPC, TanStack Query, MUI/Chakra, NextAuth, Redux/Zustand. Don't introduce them.

### Current state (commit `ad32c8d` on `claude/finance-app-build-brXBq`)

**Built and verified locally:**

- Full Drizzle schema (12 tables, 9 enums) in `src/db/schema.ts` including Phase 11.5 columns
- Idempotent seed (5 accounts, 46 categories, 6 goals, 24 settings) in `src/db/seed.ts`
- Clerk middleware + `requireUser()` / `ensureUserProvisioned()` helpers
- Sidebar + Header + MobileNav layout
- All app pages from the spec's Section 8:
  - `/` Dashboard (8 KPI tiles + 3 charts + recent tx + goals)
  - `/transactions` list with filters
  - `/transactions/new` and `/transactions/[id]/edit`
  - `/transactions/import` CSV wizard
  - `/categories` (grouped read-only)
  - `/accounts` (computed balances)
  - `/goals` + `/goals/[id]` (with confetti on completion)
  - `/net-worth` (Trend / Snapshots / Holdings tabs)
  - `/recurring`
  - `/lease`
  - `/tax-calculator`
  - `/reports/monthly` and `/reports/annual`
  - `/connections` (Phase 11.5 shell)
  - `/settings`
- All server actions for accounts / categories / transactions (with bulk + import) / goals (with contribute) / net worth (with bulkSnapshot) / recurring (with postNow + postAllDue) / settings
- CSV + XLSX export at `/api/export/csv` and `/api/export/xlsx`
- AES-256-GCM token encryption helpers in `src/lib/crypto.ts` (for Phase 11.5 access tokens)
- 43 unit tests across tax / lease / currency / validators / crypto — all passing
- `npm run build`, `npm run typecheck`, `npm run lint` all clean

**Not yet done (the to-do list):**

1. **Phase 11.5 SDK wiring (Plaid + SnapTrade live aggregation).** Schema is in. Crypto is in. `/connections` page shell is in. The SDK glue is NOT — it needs live API credentials to be testable. Specifically write:
   - `src/lib/plaid.ts` — initialize Plaid SDK from env vars
   - `src/lib/snaptrade.ts` — initialize SnapTrade SDK
   - `src/actions/aggregators.ts` — server actions: `createPlaidLinkToken`, `exchangePlaidPublicToken`, `syncPlaidConnection` (cursor loop on `/transactions/sync` + balance refresh), `ensureSnapTradeUser`, `createSnapTradeConnectionUrl`, `syncSnapTradeConnection` (account + holdings upsert)
   - `src/app/api/webhooks/plaid/route.ts` with Plaid JWT signature verification
   - `src/app/api/cron/sync-all/route.ts` with `Bearer $CRON_SECRET` auth
   - `vercel.json` with the cron schedule
   - `src/app/(app)/connections/snaptrade/callback/page.tsx`
   - `src/app/(app)/settings/category-mapping/page.tsx`
   - React Plaid Link wiring in `/connections`
   See § 16 of `README.md` for the full deferred work list and § 19 of the original spec for the full Phase 11.5 spec.

2. **Playwright e2e tests.** Config installed (`playwright.config.ts`); no `.spec.ts` files written. Add at minimum:
   - `tests/e2e/auth.spec.ts` — sign-in, dashboard, sign-out
   - `tests/e2e/transactions.spec.ts` — CRUD + filter
   - `tests/e2e/dashboard.spec.ts` — all KPIs / charts render without console errors
   - `tests/e2e/settings.spec.ts` — update salary, tax calc reflects
   - `tests/e2e/goals.spec.ts` — create + contribute + complete (confetti)
   - `tests/e2e/import.spec.ts` — upload `tests/fixtures/sample_transactions.csv`, map columns, confirm
   These need `@clerk/testing` test-mode credentials (already in devDependencies).

3. **UX polish (low priority):**
   - Drag-to-reorder on `/categories` (server action `reorderCategories` exists; wire up `@dnd-kit/sortable` in the UI)
   - Inline category-edit dropdown on the transactions table (server action `bulkUpdateCategory` exists)
   - Bulk-select checkboxes + bulk-action toolbar on `/transactions`
   - Visual screenshots committed to `tests/screenshots/`

4. **Deploy to Vercel.** This needs Rayan's auth — not something Claude can do unattended. See § 15 of `README.md`.

### How to work

- Branch: continue work on `claude/finance-app-build-brXBq` (or merge PR #1 into `main` and work directly on `main` — whichever Rayan prefers). Do NOT push directly to `main` without Rayan's explicit go-ahead.
- After completing a logical chunk of work, commit and push. Open a new PR if the existing one is already merged.
- Run `npm run typecheck && npm run lint && npm run test` before pushing — all must be clean.

### Conventions to follow (these are load-bearing)

1. **Every server action calls `requireUser()` as its first statement.** No exceptions.
2. **Every DB query filters by `userId`.** No global access paths.
3. **All amounts** stored as `numeric(14, 2)` (Drizzle returns strings); convert to number only at the display boundary using `src/lib/currency.ts`.
4. **Transaction amounts are always positive in DB.** The `type` enum (`income` / `expense` / `transfer`) determines sign at display time.
5. **All form validation** goes through Zod schemas in `src/lib/validators.ts` — schemas shared between client and server.
6. **Settings** must use the keys defined in `SETTINGS_SCHEMA` (validators.ts) — adding a key requires adding to the schema and the defaults.
7. **Server actions return `{ ok: true, data }` or `{ ok: false, error: string }`.** Never throw.
8. **Default to server components.** Only mark `'use client'` when you genuinely need hooks or browser APIs.
9. **Don't introduce new dependencies** without weighing necessity — the spec was explicit about the stack.
10. **No `console.log` in committed code.** No commented-out code. No `any` (use `unknown` or a real type).

### Key files to know

| Concept                                  | File                                             |
| ---------------------------------------- | ------------------------------------------------ |
| Database schema                          | `src/db/schema.ts`                               |
| Read queries (server components)         | `src/db/queries.ts`                              |
| Seed data                                | `src/db/seed.ts`                                 |
| Drizzle client                           | `src/db/index.ts`                                |
| Auth helpers                             | `src/lib/auth.ts`                                |
| Validators + settings schema             | `src/lib/validators.ts`                          |
| Tax estimator                            | `src/lib/tax.ts` (+ tests)                       |
| Lease overhang math                      | `src/lib/lease.ts` (+ tests)                     |
| Currency formatting                      | `src/lib/currency.ts` (+ tests)                  |
| AES-256-GCM encryption                   | `src/lib/crypto.ts` (+ tests)                    |
| Server actions                           | `src/actions/*.ts`                               |
| Pages                                    | `src/app/(app)/*/page.tsx`                       |
| UI primitives                            | `src/components/ui/*.tsx` (shadcn-style)         |
| Phase tracker / delivery state           | `BUILD_LOG.md`                                   |
| Setup walkthrough / docs                 | `README.md`                                      |

### How to verify the app actually works

1. `cp .env.example .env.local` and fill in `DATABASE_URL` (from neon.tech), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (from clerk.com).
2. `npm install`
3. `npm run db:push` — creates all tables in Neon.
4. `npm run dev` — open http://localhost:3000.
5. Sign in with the Clerk-allowlisted email. First sign-in seeds data automatically.
6. Verify the dashboard populates with seeded values + ability to add transactions, contribute to goals, etc.

### What to do first when you start

1. Read `BUILD_LOG.md` end to end — it has the phase-by-phase delivery state and known deviations.
2. Read `README.md` sections 4, 12, and 19 — repo layout, architecture conventions, and current status.
3. Confirm with Rayan which to-do item to tackle first. Most likely candidates in priority order:
   - **Playwright e2e tests** (small scope, high value as a regression net before deploy)
   - **UX polish** items (small, satisfying wins)
   - **Phase 11.5** (large; only start once Rayan has Plaid + SnapTrade API keys)

### Things you should not do

- Do not introduce a different ORM, auth library, or UI framework.
- Do not refactor working code for stylistic preference.
- Do not push to `main` without Rayan's explicit instruction.
- Do not invent features not in the spec or asked for. The spec is in the BUILD_GUIDE that started this build; the README + BUILD_LOG capture its essentials.
- Do not pretend a phase is complete when it isn't. Update `BUILD_LOG.md` honestly as you go.

### When in doubt

Ask Rayan. The original spec was very explicit about "stop, explain, ask" rather than silent design changes.

---

That's the full context. Now read `BUILD_LOG.md` and `README.md`, then ask Rayan what to tackle.
