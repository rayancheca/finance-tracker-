# Finance Tracker

A single-user personal finance dashboard for Rayan: manual transaction entry, budgets vs. actuals, goals, net worth tracking, NYC lease overhang, tax estimator, and CSV/XLSX import/export.

Built per the original `BUILD_GUIDE` spec. Stack: Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Drizzle ORM · Neon Postgres · Clerk · Recharts · Vitest + Playwright.

## Quick start

```bash
# 1. Install
npm install

# 2. Copy env template and fill in real values
cp .env.example .env.local

# 3. Push schema to your Neon database
npm run db:push

# 4. Run the dev server
npm run dev
```

Then open http://localhost:3000.

## Required env vars (minimum for v1)

See `.env.example` for the full list. The minimum to boot:

- `DATABASE_URL` — Neon Postgres connection string (from neon.tech or Vercel marketplace)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from clerk.com after creating an app

The Plaid / SnapTrade / ENCRYPTION_KEY / CRON_SECRET vars are only needed for Phase 11.5 (live aggregation), which is not enabled by default.

## Auth setup (Clerk)

1. Create an app at clerk.com
2. Settings → Restrictions → Allowlist → add `rayankarimcheca@gmail.com` and `rcheca@fordham.edu`
3. Copy the publishable + secret keys into `.env.local`

The first time you sign in, the app provisions a `users` row and seeds 5 default accounts, 46 categories, 6 goals, and 24 settings (idempotently).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:push` | Push schema directly to DB (dev/prototype) |
| `npm run db:studio` | Drizzle Studio (visual DB explorer) |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests (needs a running dev server or `PLAYWRIGHT_BASE_URL`) |

## Deploy

This is a Vercel-native app.

1. Push to GitHub
2. Create a new Vercel project pointing at the repo
3. Add all `.env.example` keys as Vercel env vars (Production + Preview)
4. Provision a Neon production database; put its URL into Vercel as `DATABASE_URL`
5. Run `DATABASE_URL=<prod_url> npm run db:push` to push the schema to prod
6. Deploy — first build will succeed; the first sign-in seeds your data

Custom domain: in Vercel → Domains, add `finance.rayancheca.com`. Update DNS per Vercel's instructions.

## Project structure (essentials)

```
src/
├── app/                 # Next.js App Router routes
│   ├── (auth)/          # Clerk sign-in / sign-up
│   ├── (app)/           # Protected app routes (Dashboard, Transactions, ...)
│   └── api/             # Export endpoints
├── components/          # Reusable React components (UI + feature)
├── db/                  # Drizzle schema, client, queries, seed
├── actions/             # Server actions, one file per resource
├── lib/                 # Pure-function utilities (tax, lease, currency, csv, crypto, validators)
└── middleware.ts        # Clerk middleware (protects all non-public routes)

tests/
├── unit/                # Vitest tests
└── e2e/                 # Playwright tests
```

## Where to look for things

| Concept | File |
| --- | --- |
| Database schema | `src/db/schema.ts` |
| Initial seed (accounts, categories, goals, settings) | `src/db/seed.ts` |
| Settings keys + defaults + validation | `src/lib/validators.ts` |
| Tax estimation (2025 brackets) | `src/lib/tax.ts` |
| NYC lease overhang logic | `src/lib/lease.ts` |
| Currency / percent formatting | `src/lib/currency.ts` |
| Token encryption (AES-256-GCM) | `src/lib/crypto.ts` |
| Auth helpers (`requireUser`, `ensureUserProvisioned`) | `src/lib/auth.ts` |

## Status (current branch)

This branch contains the v1 implementation. Phase 11.5 (live aggregation via Plaid + SnapTrade) ships the schema, the encryption helpers, and the `/connections` page shell — but does NOT include the Plaid / SnapTrade SDK integration code, because those require live API credentials to test. See `BUILD_LOG.md` for the exact phase-by-phase delivery state.

## Notes & disclaimers

- The tax calculator is **informational only** — not tax advice. Verify with the IRS or a tax pro before filing.
- State income tax uses simplified flat rates (FL/TX/WA = 0%; NY/NJ/CA/MA approximations). Brackets and credits are not modeled.
- Robinhood activity (buys/sells/dividends) intentionally does NOT flow into the main transactions table. If/when Phase 11.5 is enabled, it lives under the brokerage account's detail page.
