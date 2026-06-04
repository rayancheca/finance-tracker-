# Finance Tracker

A single-user personal finance dashboard — manual transaction tracking, budget vs. actuals, savings goals, net worth snapshots over time, NYC lease overhang tracker, an informational tax calculator (2025 brackets), recurring bills/subscriptions, and CSV/XLSX import/export. Built to mirror and extend the original `Rayan_Miami_Finance_Tracker.xlsx` workbook in a deployed web app.

Lives at (eventually) `finance.rayancheca.com`. For now: a Vercel preview URL once deployed.

> **Status:** v1 (Phases 0–13) is complete and on `main`. This branch (**PR #2**) adds the **P2 UX-polish** pass — drag-to-reorder categories, inline + bulk transaction editing, account detail pages, and empty-state illustrations — plus a zero-cloud **local dev mode** ([§ 2.4](#24-running-locally-zero-cloud--capturing-screenshots)) used to capture the screenshots above against a local Postgres. `typecheck`, `lint`, the **43/43** unit tests, and a production `build` (21 routes) all pass locally. Still outstanding: the Playwright **e2e suite**, **Phase 11.5** live aggregation (needs Plaid/SnapTrade keys), and the **Vercel deploy**. See [§ 19](#19-status--whats-left) for the full roadmap.

---

## Table of contents

- [1. What this app does](#1-what-this-app-does)
- [2. Screenshots & feature tour](#2-screenshots--feature-tour)
- [3. Tech stack](#3-tech-stack)
- [4. Repository layout](#4-repository-layout)
- [5. Prerequisites](#5-prerequisites)
- [6. First-time setup (step by step)](#6-first-time-setup-step-by-step)
- [7. Running locally](#7-running-locally)
- [8. Database — Drizzle + Neon](#8-database--drizzle--neon)
- [9. Authentication — Clerk](#9-authentication--clerk)
- [10. Environment variables reference](#10-environment-variables-reference)
- [11. Scripts](#11-scripts)
- [12. Architecture & conventions](#12-architecture--conventions)
- [13. Page-by-page reference](#13-page-by-page-reference)
- [14. Testing](#14-testing)
- [15. Deploying to Vercel](#15-deploying-to-vercel)
- [16. Phase 11.5 — Live aggregation (Plaid + SnapTrade)](#16-phase-115--live-aggregation-plaid--snaptrade)
- [17. Continuing development on a different machine](#17-continuing-development-on-a-different-machine)
- [18. Troubleshooting](#18-troubleshooting)
- [19. Status & what's left](#19-status--whats-left)
- [20. Disclaimers](#20-disclaimers)

---

## 1. What this app does

A single user (Rayan) signs in once and gets:

- **A dashboard** with eight KPI tiles (net income, expenses, cash flow, savings rate, net worth, top category, top goal, NYC lease liability) plus three charts (Income vs Expenses bar, Expense Breakdown donut, 12-month Net Cash Flow line).
- **Full transaction CRUD** — add, edit, filter, search; **re-assign a category inline** from the table via a searchable combobox; **bulk-select** rows and act on them from a sticky toolbar (delete, set category, mark cleared); CSV import with column-mapping and duplicate detection; CSV + XLSX export.
- **Category management** with monthly budgets, groups, and **drag-to-reorder within a group**.
- **Account management** — **add / edit / delete** checking, savings, credit-card, brokerage, cash, and retirement accounts with a current balance (use a negative for money owed on a card). Each has a **detail page** (`/accounts/[id]`) with a balance-over-time chart and that account's recent activity (including inbound transfers).
- **Savings goals** with progress bars, contributions log, and confetti when a goal completes.
- **Net worth snapshots** with a trend chart and a **Holdings tab** where you add positions or **import a CSV** (ticker + shares); current price, market value, and % of portfolio come from **live Yahoo Finance quotes** (no brokerage API needed) and refresh on demand.
- **Recurring bills/subscriptions** with auto-post on next-due-date and a monthly-equivalent summary.
- **NYC lease overhang tracker** showing months remaining, effective monthly share (with sublet offset), and what releasing would save.
- **Tax calculator** using 2025 federal brackets + FICA + simplified state rates, configurable, with bracket breakdown.
- **Monthly pivot report** (category × month for any year) + an **annual summary** report with comparison KPIs.
- **Settings** controlling salary, tax assumptions, lease state, housing scenario, and app preferences (theme, date format).

It is intentionally **not** Mint or YNAB — accounts and transactions are entered manually or via CSV (no automatic bank syncing in v1), it's single-user, and there's no mobile-native app. Holdings are priced from live market quotes but it's not a full portfolio-analytics tool. See § 16 for the optional live bank/brokerage aggregation extension (Phase 11.5).

---

## 2. Screenshots & feature tour

> Captured from a live local run with seeded demo data — the zero-cloud `LOCAL_DEV` path (local Postgres, no Neon/Clerk accounts) documented in [§ 2.4](#24-running-locally-zero-cloud--capturing-screenshots). Re-generate any time with `node scripts/capture-screenshots.mjs`.

### 2.1. Screenshots

**Dashboard** — eight KPI tiles, three charts (Income vs Expenses, Expense Breakdown, 12-mo Net Cash Flow), recent activity, and goal progress, in light and dark:

![Dashboard, light mode](docs/screenshots/01-dashboard-light.png)
![Dashboard, dark mode](docs/screenshots/01-dashboard-dark.png)

**Transactions — bulk-select toolbar (P2).** Selecting rows reveals a floating toolbar: *Mark cleared*, *Set category…*, *Delete*.

![Transactions with the bulk-actions toolbar](docs/screenshots/02-transactions-bulk-toolbar.png)

**Transactions — inline category edit (P2).** Clicking a category badge opens a searchable combobox, scoped to the row's transaction type.

![Inline category combobox open](docs/screenshots/02b-transactions-inline-category.png)

**Categories — drag-to-reorder (P2).** Each row has a grip handle; reordering within a group persists.

![Categories with drag handles](docs/screenshots/03-categories-reorder.png)

**Account detail (P2)** — header, balance-over-time area chart, and direction-aware recent activity:

![Account detail page](docs/screenshots/05-account-detail-light.png)

**Net worth trend** and the **monthly category × month report**:

![Net worth trend](docs/screenshots/07-net-worth-trend.png)
![Monthly report pivot](docs/screenshots/08-reports-monthly.png)

**Tax calculator** (2025 brackets + FICA + state) and **Goals** (progress bars, one completed):

![Tax calculator](docs/screenshots/09-tax-calculator.png)
![Goals grid](docs/screenshots/06-goals.png)

**Edit your own data** — add / edit real accounts and cards (the app's first modal):

![Add account dialog](docs/screenshots/10-add-account-dialog.png)

**Investments with live prices** — add or CSV-import holdings; price, market value, and % of portfolio come from live Yahoo Finance quotes:

![Holdings with live market prices](docs/screenshots/11-holdings-live-prices.png)

### 2.2. App shell

```
┌─────────────────────────────────────────────────────────────────┐
│  Sidebar (desktop)        │  Header (theme toggle + user menu)  │
│  ──────────────────       │  ─────────────────────────────────  │
│  • Dashboard              │                                      │
│  • Transactions           │       <Page content>                 │
│  • Categories             │                                      │
│  • Accounts               │                                      │
│  • Goals                  │                                      │
│  • Net Worth              │                                      │
│  • Recurring              │                                      │
│  • NYC Lease              │                                      │
│  • Tax                    │                                      │
│  • Reports                │                                      │
│  • Connections            │                                      │
│  • Settings               │                                      │
└─────────────────────────────────────────────────────────────────┘

Mobile: sidebar collapses → bottom nav (Home / Tx / + / Goals / Settings).
The center "+" button is a FAB that opens the new-transaction form.
```

### 2.3. Guided golden-path tour

The walkthrough a first-time user follows, start to finish. Each step is a distinct, screenshot-worthy state. (Steps 1–2 describe the production Clerk flow; in `LOCAL_DEV` a fixed dev user is provisioned automatically.)

1. **Sign in.** Hitting any route while signed out redirects to `/sign-in` (Clerk). Sign-up is allowlist-restricted to the owner's email, so the app is effectively single-user.
2. **First-run provisioning.** On the first authenticated request, the user is mirrored into the `users` table and `seedNewUser()` inserts 5 accounts, 46 categories, 6 goals, and 24 settings — so the dashboard is populated immediately, never empty.
3. **Dashboard (`/`).** Eight KPI tiles (net income, expenses, cash flow, savings rate, net worth + 30-day delta, top category, top goal, NYC lease) above three charts (Income vs Expenses 6-mo bar, Expense Breakdown donut, 12-mo Net Cash Flow line), then recent transactions and goal progress. Toggle light/dark from the header.
4. **Add a transaction (`/transactions/new`).** Income / Expense / Transfer toggle; per-type required fields; cleared switch. Saving returns to the list and the dashboard KPIs reflect it.
5. **Transactions list (`/transactions`).** Filter by search/date/type/account (URL-synced). **New in P2:** click a row's category badge to reassign it inline via a searchable combobox (scoped to the row's type); tick the checkboxes to reveal a floating toolbar — *Mark cleared*, *Set category…*, *Delete* — acting on the whole selection.
6. **Categories (`/categories`).** Budgets grouped by bucket. **New in P2:** grab the ⠿ handle to drag-reorder categories within a group (keyboard-operable); the new order persists.
7. **Account detail (`/accounts/[id]`). New in P2:** click any account card to drill in — header with the live balance, a balance-over-time area chart, and direction-aware recent activity (inbound transfers show as `+`).
8. **Goals (`/goals/[id]`).** Contribute to a goal; crossing the target flips it to `completed` and fires confetti.
9. **CSV import (`/transactions/import`).** Upload → map columns (auto-detected) → 10-row preview → confirm; duplicates are skipped.
10. **Reports & export (`/reports/*`).** Monthly category × month pivot and an annual summary, with year-scoped CSV/XLSX download.
11. **Empty states. New in P2:** every list surface (transactions, categories, accounts, goals, net-worth, recurring, connections) renders a designed empty state (icon + heading + subline + CTA) instead of bare text.

### 2.4. Running locally (zero cloud) + capturing screenshots

To run with **no Neon and no Clerk account**, set `NEXT_PUBLIC_LOCAL_DEV=1`. It points the DB layer at a local Postgres (via `pg`) and replaces Clerk with a single fixed dev user. Production is unaffected — with the flag unset it uses Neon + Clerk exactly as before.

```bash
# 1. Local Postgres (macOS / Homebrew)
brew install postgresql@16 && brew services start postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"   # postgresql@16 is keg-only
createdb finance_tracker

# 2. Point the app at it, in local mode
cat > .env.local <<EOF
DATABASE_URL="postgres://$(whoami)@localhost:5432/finance_tracker"
NEXT_PUBLIC_LOCAL_DEV="1"
EOF

# 3. Create the tables, then run
DATABASE_URL="postgres://$(whoami)@localhost:5432/finance_tracker" npm run db:push   # answer "Yes"
npm run dev    # http://localhost:3000 — no sign-in; a dev user is auto-seeded
```

On first load the dev user is provisioned and seeded (5 accounts, 46 categories, 6 goals). Add activity via `/transactions/new` or the CSV import (`/transactions/import`) to populate the charts.

The screenshots above are captured from this local run with a committed Playwright script:

```bash
npx playwright install chromium      # one-time
node scripts/capture-screenshots.mjs # writes docs/screenshots/*.png (1440px, light + dark)
```

The full feature walkthrough — every page, every form, every server action — is in [§ 13](#13-page-by-page-reference).

---

## 3. Tech stack

| Layer            | Choice                                  | Why                                                         |
| ---------------- | --------------------------------------- | ----------------------------------------------------------- |
| Framework        | **Next.js 15** (App Router)             | Server components + server actions; Vercel-native           |
| Language         | **TypeScript** (`strict: true`)         | Type safety end-to-end                                      |
| Runtime          | Node 20 LTS                             | Vercel default                                              |
| Styling          | **Tailwind CSS** 3.4                    | Standard, fast                                              |
| Components       | **shadcn/ui** primitives (Radix-based)  | Copy-in, fully owned, themeable                             |
| Icons            | lucide-react                            | Pairs with shadcn                                           |
| Charts           | **Recharts** 2.x                        | Declarative, no canvas tricks needed                        |
| Database         | **Neon Postgres** (serverless)          | Branchable, generous free tier, Vercel marketplace          |
| ORM              | **Drizzle ORM**                         | Type-safe, edge-compatible, lightweight                     |
| Migrations       | drizzle-kit                             | Schema-as-code                                              |
| Auth             | **Clerk**                               | Drop-in, supports passkeys + magic links, free <10k MAU     |
| Forms            | React Hook Form + Zod                   | Standard pairing                                            |
| Dates            | date-fns 3                              | Tree-shakeable                                              |
| CSV              | papaparse                               | Reliable parser                                             |
| XLSX             | exceljs                                 | Flexible writes                                             |
| Toasts           | sonner                                  | Clean and accessible                                        |
| Tests            | Vitest (unit) + Playwright (e2e)        | Industry standard                                           |
| Lint / format    | ESLint + Prettier                       | Standard                                                    |
| Deploy           | Vercel                                  | Required by spec                                            |

**Deliberately not used:** Prisma, tRPC, TanStack Query, MUI/Chakra, NextAuth, Redux/Zustand. The spec was explicit on this; don't substitute without thinking it through.

---

## 4. Repository layout

```
finance-tracker-/
├── .env.example                # Template for required env vars (no real values)
├── .eslintrc.json              # ESLint config (extends next/core-web-vitals)
├── .gitignore
├── .prettierrc                 # Prettier config (+ tailwind plugin)
├── BUILD_LOG.md                # Phase-by-phase delivery state
├── CONTINUE.md                 # Prompt to hand a future Claude to continue this build
├── README.md                   # You are here
├── components.json             # shadcn config
├── drizzle.config.ts           # Drizzle Kit config (reads DATABASE_URL)
├── middleware.ts               # Clerk auth middleware (protects all routes except sign-in/up + webhooks)
├── next.config.ts
├── package.json
├── playwright.config.ts        # E2E test config
├── postcss.config.mjs
├── public/
│   └── manifest.json           # PWA manifest
├── tailwind.config.ts          # Tailwind theme (warm-light + dark mode with brand teal/gold)
├── tsconfig.json               # Strict TS with @/* path alias
├── vitest.config.ts            # Unit test config
│
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Public auth pages
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (app)/                     # Protected app routes (share a layout)
│   │   │   ├── layout.tsx             # Sidebar + Header + MobileNav, calls ensureUserProvisioned()
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── transactions/
│   │   │   │   ├── page.tsx           # List + filters + pagination
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/edit/page.tsx
│   │   │   │   └── import/page.tsx    # CSV wizard
│   │   │   ├── categories/page.tsx
│   │   │   ├── accounts/page.tsx
│   │   │   ├── goals/
│   │   │   │   ├── page.tsx           # Card grid
│   │   │   │   └── [id]/page.tsx      # Detail + contributions + history
│   │   │   ├── net-worth/page.tsx     # Trend + snapshots + Holdings tabs
│   │   │   ├── recurring/page.tsx
│   │   │   ├── lease/page.tsx
│   │   │   ├── tax-calculator/page.tsx
│   │   │   ├── reports/
│   │   │   │   ├── monthly/page.tsx   # Category × month pivot
│   │   │   │   └── annual/page.tsx
│   │   │   ├── connections/page.tsx   # Phase 11.5 shell
│   │   │   └── settings/page.tsx
│   │   ├── api/
│   │   │   └── export/
│   │   │       ├── csv/route.ts       # GET ?year=YYYY → CSV download
│   │   │       └── xlsx/route.ts      # GET ?year=YYYY → XLSX download
│   │   ├── layout.tsx                 # Root layout (Clerk provider, theme, sonner)
│   │   ├── globals.css                # Tailwind base + CSS variables
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn-style primitives (Button, Card, ...)
│   │   ├── layout/                    # Sidebar, Header, MobileNav
│   │   ├── dashboard/                 # KpiTile, charts, etc.
│   │   ├── transactions/              # TransactionForm, CsvImportWizard
│   │   ├── goals/                     # GoalCard, ContributeForm
│   │   ├── net-worth/                 # NetWorthChart
│   │   ├── lease/                     # LeaseForm
│   │   ├── tax/                       # TaxCalculatorForm
│   │   ├── settings/                  # SettingsForm (multi-section)
│   │   └── theme-provider.tsx
│   │
│   ├── db/
│   │   ├── schema.ts                  # All 12 tables + 9 enums
│   │   ├── index.ts                   # Drizzle client (Neon HTTP)
│   │   ├── queries.ts                 # Read helpers (server components call these)
│   │   ├── seed.ts                    # seedNewUser(userId) — idempotent
│   │   └── seed-cli.ts                # `npm run db:seed <userId>` entrypoint
│   │
│   ├── actions/                       # 'use server' — one file per resource
│   │   ├── accounts.ts
│   │   ├── categories.ts
│   │   ├── transactions.ts            # incl. bulk + CSV import
│   │   ├── goals.ts                   # incl. contributeToGoal
│   │   ├── netWorth.ts                # incl. bulkSnapshotFromTransactions
│   │   ├── recurring.ts               # incl. postRecurringNow / postAllDueRecurring
│   │   └── settings.ts                # validated against SETTINGS_SCHEMA
│   │
│   └── lib/
│       ├── auth.ts                    # requireUser() + ensureUserProvisioned()
│       ├── tax.ts                     # 2025 federal/FICA/state estimator
│       ├── lease.ts                   # NYC lease overhang math
│       ├── currency.ts                # USD formatting helpers
│       ├── dates.ts                   # date-fns wrappers
│       ├── csv.ts                     # papaparse wrappers
│       ├── crypto.ts                  # AES-256-GCM token encryption (Phase 11.5)
│       ├── validators.ts              # Zod schemas + SETTINGS_SCHEMA + defaults
│       └── utils.ts                   # cn() classname merger
│
└── tests/
    ├── fixtures/
    │   └── sample_transactions.csv    # 10 rows for CSV import smoke test
    └── unit/
        ├── tax.test.ts                # 13 cases (incl. workbook reference)
        ├── lease.test.ts              # 6 cases (all states + edge cases)
        ├── currency.test.ts           # 11 cases
        ├── validators.test.ts         # 8 cases
        └── crypto.test.ts             # 5 cases (round-trip / tamper / IV unique)
```

---

## 5. Prerequisites

Before doing anything else, install:

| Tool       | Version       | Install                                                              |
| ---------- | ------------- | -------------------------------------------------------------------- |
| Node.js    | 20.x LTS      | `nvm install 20 && nvm use 20`, or [nodejs.org](https://nodejs.org)  |
| npm        | 10.x+         | bundled with Node                                                    |
| Git        | any recent    | `brew install git` on macOS                                          |
| Postgres client (optional) | any | `brew install libpq` if you want `psql` for poking at the DB |

Verify:

```bash
node --version    # should print v20.x
npm --version     # should print 10.x or 11.x
git --version
```

You'll also need accounts at:

1. **GitHub** — to clone & push (you already have this; the repo lives at `rayancheca/finance-tracker-`).
2. **Neon** (neon.tech) — Postgres database. Free tier is fine.
3. **Clerk** (clerk.com) — authentication. Free tier is fine.
4. **Vercel** (vercel.com) — deploy target.
5. **Plaid** (plaid.com) and **SnapTrade** (snaptrade.com) — *only* if you want Phase 11.5 (live aggregation). Skip if you're fine with manual entry + CSV import.

---

## 6. First-time setup (step by step)

This walks the entire path from "fresh machine" to "running app at localhost:3000."

### 6.1. Clone the repo

```bash
git clone https://github.com/rayancheca/finance-tracker-.git
cd finance-tracker-
```

> `main` is the populated default branch (v1, Phases 0–13). The **P2 UX-polish** pass lives on `p2/ux-polish` (PR #2); check that branch out (`git checkout p2/ux-polish`) or merge the PR to get it on `main`.

### 6.2. Install dependencies

```bash
npm install
```

This takes ~1–2 minutes and pulls down ~770 packages. You may see deprecation warnings — they're harmless (mostly transitive dependencies of dev tools).

### 6.3. Create a Neon database

1. Go to [neon.tech](https://neon.tech) → sign up → create a project. Name it "finance-tracker".
2. Region: pick whatever's closest to you (us-east is the safe default).
3. On the project dashboard, find the **Connection string** for the `main` branch — it'll look like:
   ```
   postgres://username:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Copy that string. You'll paste it as `DATABASE_URL` in `.env.local` next.

> **Tip:** Neon supports branches. For a dev/prod separation, create a second branch and use its connection string in Vercel for production while keeping the main branch's URL for local dev.

### 6.4. Create a Clerk app

1. Go to [clerk.com](https://clerk.com) → sign up → "Create application."
2. Name it "Finance Tracker." Enable **Email** sign-in (magic link works fine) and optionally **Passkeys**.
3. In the dashboard, copy the **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`).
4. **Restrict sign-ups to just you:**
   - In the Clerk dashboard, go to *User & Authentication → Restrictions*.
   - Enable **Allowlist** and add the email(s) you sign in with (e.g. `rayankarimcheca@gmail.com`, `rcheca@fordham.edu`).
   - This makes the app effectively single-user — no public sign-ups possible.
5. Set the post sign-in redirect to `/` (the app dashboard) — this is also wired in `.env.local`.

### 6.5. Configure environment variables

Copy the template and fill in the real values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# From Neon (step 6.3)
DATABASE_URL="postgres://username:password@ep-xyz.us-east-1.aws.neon.tech/neondb?sslmode=require"

# From Clerk (step 6.4)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# These can stay as-is for local dev
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# Leave the Plaid / SnapTrade / ENCRYPTION_KEY / CRON_SECRET vars empty for now
# (only needed for Phase 11.5)
```

> `.env.local` is gitignored — never commit it. Only `.env.example` (placeholders) is committed.

### 6.6. Push the schema to your database

```bash
npm run db:push
```

This reads `src/db/schema.ts` and creates all 12 tables in Neon. It's idempotent — you can re-run safely.

### 6.7. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/sign-in`. Sign in with your Clerk-allowlisted email.

On your **first** authenticated request:
- A row is inserted into the `users` table (mirroring your Clerk user).
- The app calls `seedNewUser(userId)` which inserts 5 accounts, 46 categories, 6 goals, and 24 settings — **idempotently**, so subsequent sign-ins don't re-seed.

You should now see a populated dashboard.

### 6.8. (Optional) Inspect the database

```bash
npm run db:studio
```

Opens Drizzle Studio in your browser — a visual table explorer. Useful for debugging.

---

## 7. Running locally

Daily workflow once setup is done:

```bash
npm run dev               # Start dev server at :3000
npm run test:watch        # Run unit tests in watch mode (in another terminal)
```

The dev server uses Turbopack and hot-reloads on file changes. Server actions revalidate the relevant paths automatically.

### Common things to do

**Reset your local seed data** (start over):

1. In Drizzle Studio (or psql), delete rows in the `users` table — the cascade will wipe everything.
2. Sign out + sign back in. Seeding runs again.

**Make a schema change:**

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` to produce a migration file in `src/db/migrations/`, or `npm run db:push` for prototype-style direct push.
3. Restart the dev server.

**Add a new shadcn-style component:** components in `src/components/ui/` follow shadcn's exact patterns. You can either copy from [ui.shadcn.com](https://ui.shadcn.com/docs/components) or run `npx shadcn@latest add <name>` (interactive — won't work in headless environments). I wrote the components inline in this build for portability.

---

## 8. Database — Drizzle + Neon

### Schema overview

12 tables, 9 enums. All user-scoped tables include a `userId text` column that references `users.id` (which equals the Clerk user ID).

| Table                     | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `users`                   | Mirror of Clerk users (id, email, fullName)                    |
| `accounts`                | Bank / card / cash / brokerage accounts                        |
| `categories`              | Spending categories with monthly budgets, grouped              |
| `transactions`            | The main ledger — income / expense / transfer                  |
| `recurring_transactions`  | Subscription / bill templates with `nextDueDate`               |
| `goals`                   | Savings goals with target/current amounts                      |
| `goal_contributions`      | Contribution log per goal                                      |
| `net_worth_snapshots`     | Periodic balance snapshots per account                         |
| `settings`                | Key-value bag (validated app-side via SETTINGS_SCHEMA)         |
| `aggregator_connections`  | Phase 11.5 — Plaid / SnapTrade items                           |
| `holdings`                | Phase 11.5 — brokerage positions                               |
| `sync_logs`               | Phase 11.5 — audit trail for syncs                             |
| `plaid_category_map`      | Phase 11.5 — Plaid → local category mapping                    |

Full type definitions: [`src/db/schema.ts`](./src/db/schema.ts).

### Migrations vs. push

- `npm run db:push` — instant; modifies the DB to match the schema. Best for dev / prototyping.
- `npm run db:generate` — produces a `.sql` migration file. Best for production once you have data you care about.
- `npm run db:studio` — visual explorer.

### Query layer

Read queries live in `src/db/queries.ts` (called from server components). Write actions live in `src/actions/*.ts` (called from client components via React server actions). **All queries filter by `userId`** — there is no global access path.

---

## 9. Authentication — Clerk

### How it works

- `middleware.ts` runs `clerkMiddleware` against every request. Public paths (`/sign-in`, `/sign-up`, `/api/webhooks/*`, `/api/cron/*`) skip auth; everything else calls `auth.protect()`.
- `src/lib/auth.ts` exports `requireUser()` and `ensureUserProvisioned()`. Every server action and protected page calls one of these first.
- On first authenticated request to `(app)/layout.tsx`, `ensureUserProvisioned()`:
  1. Calls Clerk's `currentUser()` to get email + name.
  2. `INSERT … ON CONFLICT DO NOTHING` into our `users` table.
  3. If we just inserted (i.e. fresh user), dynamically imports `seedNewUser()` and runs it.

### Rotating Clerk keys

1. Generate new keys in the Clerk dashboard.
2. Update `.env.local` (and Vercel env vars in production).
3. Restart the dev server. Existing sessions remain valid until they naturally expire because Clerk uses JWTs.

### Adding another user later

Add their email to Clerk's allowlist. On their first sign-in, they'll be provisioned and seeded into a fresh, separate set of data. The schema is already user-scoped — no code changes needed.

---

## 10. Environment variables reference

The full list, in the order they appear in `.env.example`:

### Required for v1

| Var                                       | Source                          | Notes                                                       |
| ----------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`                            | Neon dashboard                  | Postgres connection string with `?sslmode=require`          |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`       | Clerk dashboard → API keys      | `pk_test_…` (dev) or `pk_live_…` (prod)                     |
| `CLERK_SECRET_KEY`                        | Clerk dashboard → API keys      | `sk_test_…` (dev) or `sk_live_…` (prod)                     |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`           | static                          | `/sign-in`                                                  |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`           | static                          | `/sign-up`                                                  |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`     | static                          | `/`                                                         |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`     | static                          | `/`                                                         |
| `NEXT_PUBLIC_APP_URL`                     | static or Vercel URL            | `http://localhost:3000` dev; deployed origin in prod        |
| `NODE_ENV`                                | static                          | `development` / `production`                                |

### Optional (Phase 11.5 — live aggregation)

| Var                                       | Source                          | Notes                                                       |
| ----------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| `PLAID_CLIENT_ID`                         | Plaid dashboard                 |                                                             |
| `PLAID_SECRET`                            | Plaid dashboard                 | Use Sandbox first; request Production access for real banks |
| `PLAID_ENV`                               | static                          | `sandbox` / `development` / `production`                    |
| `PLAID_PRODUCTS`                          | static                          | e.g. `transactions,auth,investments,liabilities`            |
| `PLAID_COUNTRY_CODES`                     | static                          | `US`                                                        |
| `PLAID_WEBHOOK_URL`                       | your deployed URL               | `https://your-domain/api/webhooks/plaid`                    |
| `SNAPTRADE_CLIENT_ID`                     | SnapTrade dashboard             |                                                             |
| `SNAPTRADE_CONSUMER_KEY`                  | SnapTrade dashboard             |                                                             |
| `SNAPTRADE_REDIRECT_URI`                  | your deployed URL               | `https://your-domain/connections/snaptrade/callback`        |
| `ENCRYPTION_KEY`                          | generate locally                | `openssl rand -base64 32` — must be 32 bytes base64-encoded |
| `CRON_SECRET`                             | generate locally                | Random string; also set in Vercel cron config               |

---

## 11. Scripts

All defined in `package.json`:

| Script                  | What it does                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Start Next.js dev server with hot-reload at `:3000`                  |
| `npm run build`         | Production build (Turbopack-compiled bundles + page collection)      |
| `npm run start`         | Run the production build locally                                     |
| `npm run lint`          | ESLint over the whole codebase                                       |
| `npm run typecheck`     | `tsc --noEmit` strict TypeScript check                               |
| `npm run format`        | Prettier write to every file                                         |
| `npm run db:generate`   | Generate a Drizzle migration from schema diff                        |
| `npm run db:push`       | Push the schema directly to the DB (no migration file)               |
| `npm run db:studio`     | Open Drizzle Studio (visual DB browser)                              |
| `npm run db:seed <id>`  | Manually run `seedNewUser(<id>)` for a given Clerk user ID           |
| `npm run test`          | Vitest unit tests once                                               |
| `npm run test:watch`    | Vitest in watch mode                                                 |
| `npm run test:e2e`      | Playwright e2e tests (requires `PLAYWRIGHT_BASE_URL` or local dev)   |

---

## 12. Architecture & conventions

### Server-first

This is a **server-component-by-default** app. Pages are async server components that call read queries in `src/db/queries.ts` directly. Forms are client components that call **server actions** in `src/actions/`. There's no API route layer for app data — server actions handle mutations.

### Server-action pattern

Every action follows the same shape:

```typescript
'use server';

import { db } from '@/db';
import { requireUser } from '@/lib/auth';
import { someSchema } from '@/lib/validators';
import { revalidatePath } from 'next/cache';

export async function doThing(input: unknown) {
  const userId = await requireUser();             // 1. Auth gate
  const parsed = someSchema.safeParse(input);     // 2. Validate
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const [row] = await db.insert(table).values({   // 3. DB op, scoped to userId
    ...parsed.data,
    userId,
  }).returning();

  revalidatePath('/relevant-route');              // 4. Revalidate
  return { ok: true, data: row };                 // 5. Return discriminated union
}
```

Every action returns `{ ok: true, data }` or `{ ok: false, error }` — never throws. Clients destructure and call `toast.error(res.error)` on failure.

### Auth invariants

- **Every server action** calls `requireUser()` as its first statement. No exceptions.
- **Every DB query** filters by `userId` (or by a foreign-key chain that ultimately includes `userId`).
- **No global queries.** There is no way for one user's request to see another user's data, even if multi-user is added later.

### Validation

All inputs use Zod schemas defined in `src/lib/validators.ts`. The schemas are shared between client (form validation) and server (action input validation). Settings have a strongly-typed key→schema map (`SETTINGS_SCHEMA`) so writing an unknown key fails at compile time.

### Money handling

- All amounts are stored as `numeric(14, 2)` in Postgres → returned as `string` by Drizzle.
- The display layer (`src/lib/currency.ts`) parses strings to numbers at the boundary.
- Transaction amounts are always **positive** in storage; the `type` column (`income` / `expense` / `transfer`) determines the sign.

### Theming

- Tailwind CSS variables in `src/app/globals.css` provide light + dark palettes.
- Brand colors: `#0F3D3E` (deep teal), `#C9A227` (gold), `#1B8B4F` (income green), `#C84B3A` (expense red).
- Toggle handled by `next-themes`; user preference persists in localStorage.

---

## 13. Page-by-page reference

### `/` — Dashboard

- 8 KPI tiles in a responsive 2 (mobile) / 4 (desktop) grid.
- Income vs Expenses bar chart (last 6 months) + Expense Breakdown donut (current month).
- Net Cash Flow 12-month line chart with zero baseline.
- Recent transactions (last 10) + Goals progress list.
- All tile clicks navigate to the relevant detail page.

### `/transactions`

- Filter bar (search, date range, type, account) syncs to URL via GET params.
- Table with pagination (50 rows/page).
- **Inline category edit (P2):** click a row's category badge to open a searchable Popover + `cmdk` combobox and reassign it via `bulkUpdateCategory([id], …)` without leaving the page. Options are scoped to the row's transaction type; transfer rows show a static, non-editable badge.
- **Bulk actions (P2):** a leading checkbox column with a tri-state select-all header. Selecting ≥1 row reveals a floating sticky toolbar — **Mark cleared** (`bulkSetCleared`), **Set category…** (`bulkUpdateCategory`, searchable picker), **Delete** (`bulkDeleteTransactions`, confirm-guarded). The selection is pruned against on-screen rows so an action can never hit a row scrolled/filtered out of view.
- "Import" → CSV wizard. "New" → `/transactions/new`.
- Edit → `/transactions/[id]/edit`.

### `/transactions/new` & `/transactions/[id]/edit`

- Type toggle: Income / Expense / Transfer.
- Required fields per type (transfer requires `transferAccountId`; income/expense require `categoryId`).
- Cleared switch (defaults on).
- Delete button on the edit form.

### `/transactions/import`

- Upload CSV → auto-detect columns (date, amount, description, merchant, type) with keyword heuristics.
- Manual override on each mapping.
- 10-row preview.
- Duplicate detection on (userId, accountId, date, amount, description).
- Server action `importTransactions()` inserts and reports `{ inserted, skipped }`.

### `/categories`

- Grouped view with monthly budgets per category and Income / Expense / Savings kind badges.
- **Drag-to-reorder (P2):** grab the ⠿ handle to reorder categories within a group (`@dnd-kit`, keyboard-operable). Drops post the full ordered id list to `reorderCategories` so `sortOrder` stays globally monotonic; the update is optimistic and rolls back with a toast on failure.

### `/accounts`

- Card grid with computed live balance: opening + Σincome − Σexpense − Σtransfers-out + Σtransfers-in.
- Auto-synced accounts show a ⚡ icon (Phase 11.5).
- If `lastReportedBalance` exists and is <48h old, that's preferred over the computed balance.
- **Each card links to its detail page (P2):** `/accounts/[id]`.
- **Add / edit / delete accounts:** "Add account" opens a modal form (name, type, current balance, institution, last-4, color); the detail page has Edit / Archive / Delete. Set a negative balance for money owed on a card.

### `/accounts/[id]` — Account detail (P2)

- Header: account name, type badge, institution/last-4, and the live balance.
- **Balance-over-time** area chart, folding a running balance from this account's transactions with the same signing as the list-page balance (income +, expense −, transfers by direction).
- **Recent activity** table that includes inbound transfers (where this account is the destination) with direction-aware signing, so the table and the chart agree on what counts as activity.
- Scoped by `userId`; an id that isn't the signed-in user's 404s via `notFound()`.

### `/goals` & `/goals/[id]`

- Card grid sorted by priority desc.
- Detail page: progress bar, contribute form, history log.
- Contribution that takes current ≥ target flips status to `completed` and fires confetti.

### `/net-worth`

- Header KPI: sum of latest snapshot per account (or computed if no snapshots).
- Three tabs: **Trend** (area chart), **Snapshots** (history table), and **Holdings**.
- **Holdings** is a manager: add a position (ticker + shares), import a CSV (`symbol`, `quantity`, optional cost basis), refresh, or delete. You supply the quantities; **current price, market value, and % of portfolio come from live Yahoo Finance quotes** (`yahoo-finance2`) and update on **Refresh prices**. No brokerage API required.

### `/recurring`

- Read-only table of recurring entries.
- Summary KPI: monthly subscription cost.
- Server actions `postRecurringNow(id)` and `postAllDueRecurring()` (the latter only auto-posts entries with `autoPost = true`).

### `/lease`

- Status badge (active / subletting / released).
- KPIs: months remaining, effective monthly share, total liability.
- Form to update status, share, end date, sublet offset (writes to settings).

### `/tax-calculator`

- Inputs form (gross, filing status, 401k %, health, HSA, state, standard deduction).
- Right panel: pre-tax deductions, taxable income, federal tax, FICA, state tax, totals, net annual / monthly / per paycheck, effective rate, marginal bracket.
- Federal bracket breakdown card below.
- Saves to settings.

### `/reports/monthly`

- Year selector.
- Pivot: rows = categories grouped, columns = Jan–Dec, cells = amount.
- Row totals + monthly totals row at the bottom.

### `/reports/annual`

- 4 KPI cards (total income, expenses, saved, savings rate).
- Biggest expense / income category callouts.
- CSV + XLSX export buttons (year-scoped).

### `/connections`

- Phase 11.5 page.
- Lists existing aggregator connections (none until Phase 11.5 wiring is completed).
- Limitation banner about auto-sync caveats.

### `/settings`

- Profile card (Clerk-sourced, read-only).
- Salary & Job section.
- Housing section.
- App preferences section (theme, date format).
- Each section saves independently.

---

## 14. Testing

### Unit tests (Vitest)

```bash
npm run test           # one-shot
npm run test:watch     # watch mode
```

43 tests across 5 files:

- `tests/unit/tax.test.ts` — 13 cases: workbook reference ($65k FL single → ~$54,114 net), top bracket, NY state, 401(k) reduction, MFJ brackets, HSA reduction.
- `tests/unit/lease.test.ts` — 6 cases: active, subletting offset, offset cap, released, past end date, releaseSavings.
- `tests/unit/currency.test.ts` — 11 cases.
- `tests/unit/validators.test.ts` — 8 cases (happy + sad paths).
- `tests/unit/crypto.test.ts` — 5 cases (ASCII / unicode / empty / tamper-detect / IV-uniqueness).

### E2E tests (Playwright)

`playwright.config.ts` is present (it boots `npm run dev` and targets `http://localhost:3000`), but **no specs are written yet** and **`@clerk/testing` is not installed** — it will be added when the suite is built. Getting them green requires a running app with real data (a Clerk dev instance + a database), because every route is auth-protected. Once those exist:

```bash
npm install @clerk/testing   # not yet a dependency
npx playwright install        # one-time browser install
npm run test:e2e
```

Planned specs: `auth` (sign in / out, protected-route redirects), `transactions` (CRUD + filter + inline & bulk edit), `dashboard` (8 KPIs + 3 charts render, no console errors), `settings` → tax-calculator reflection, `goals` (contribute + complete + confetti), `import` (CSV map → confirm → row count). Tracked in [§ 19](#19-status--whats-left).

---

## 15. Deploying to Vercel

### One-time setup

1. Go to [vercel.com](https://vercel.com) → "Add New" → "Project" → import from GitHub.
2. Select `rayancheca/finance-tracker-`.
3. Framework preset: Next.js (auto-detected).
4. Root directory: leave as `./`.
5. Build & output settings: defaults are fine.

### Environment variables (per environment)

In Vercel project settings → Environment Variables, add **every** variable from `.env.example` for both Production and Preview environments. Use the **same** values as `.env.local` for Preview; use **production** Clerk keys + a **production** Neon connection string for Production.

> **Critical:** don't reuse your dev Neon URL for production. Create a separate Neon project (or branch) for prod.

### Push production schema

```bash
DATABASE_URL="<production_neon_url>" npm run db:push
```

### Deploy

Either:
- Push to `main` (auto-deploys to Production), or
- In the Vercel dashboard, click "Deploy" on the latest commit.

The first build will take ~2 minutes. After it succeeds:

1. Click the deployment URL.
2. Sign in with your allowlisted Clerk email.
3. Verify the dashboard loads with seeded data.

### Custom domain

1. Vercel project → Domains → Add `finance.rayancheca.com`.
2. Update DNS at your registrar per Vercel's instructions (CNAME or A record).
3. Wait for cert provisioning (~minutes).
4. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars and redeploy.

### Smoke test (after first deploy)

Walk through the spec's Section 14 checklist:

- [ ] Sign-in works
- [ ] Add income / expense / transfer transactions → KPI tiles update
- [ ] Filter transactions
- [ ] Edit a transaction → updates persist
- [ ] Add a net worth snapshot
- [ ] Create + contribute to a goal (verify confetti on completion)
- [ ] View `/reports/monthly` with real data
- [ ] Download XLSX (open it in Numbers/Excel)
- [ ] Mobile viewport — bottom nav + FAB visible
- [ ] Dark mode toggle works on every page
- [ ] Sign out → redirected to `/sign-in`
- [ ] Direct-link to `/transactions` while signed out → redirected to `/sign-in`

---

## 16. Phase 11.5 — Live aggregation (Plaid + SnapTrade)

**This is partially implemented.** The schema, crypto helpers, and `/connections` page shell are in. The SDK glue is **not** — it was deferred because it can't be tested without live API credentials.

### What's already done

- DB schema (`aggregator_connections`, `holdings`, `sync_logs`, `plaid_category_map`).
- `accounts` and `transactions` have the necessary join columns (`connectionId`, `externalAccountId`, `isAutoSynced`, `lastReportedBalance`, `externalTransactionId`, `syncedFromConnectionId`, `isManuallyEdited`).
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt for at-rest token storage. 5 unit tests covering round-trip, tamper detection, and IV uniqueness.
- `/connections` page UI shell with empty state and the auto-sync limitation banner.

### What still needs to be wired (the work)

To enable Phase 11.5, write these files:

1. **`src/lib/plaid.ts`** — initialize the Plaid SDK with env vars.
2. **`src/lib/snaptrade.ts`** — initialize the SnapTrade SDK.
3. **`src/actions/aggregators.ts`** — server actions:
   - `createPlaidLinkToken()` → returns `link_token` from `plaid.linkTokenCreate(...)`
   - `exchangePlaidPublicToken(publicToken, metadata)` → exchange + persist encrypted access token + bootstrap accounts
   - `syncPlaidConnection(connectionId)` → `/transactions/sync` cursor loop + balance refresh
   - `ensureSnapTradeUser()` → idempotent SnapTrade user registration (stores `userSecret` in settings, encrypted)
   - `createSnapTradeConnectionUrl()` → returns SnapTrade portal URL
   - `syncSnapTradeConnection(connectionId)` → upserts accounts + holdings
4. **`src/app/api/webhooks/plaid/route.ts`** — handler with Plaid JWT verification (`Plaid-Verification` header) that triggers sync on `SYNC_UPDATES_AVAILABLE` and flips `status` on `ITEM_LOGIN_REQUIRED`.
5. **`src/app/api/cron/sync-all/route.ts`** — auth via `Bearer $CRON_SECRET`, loops active connections and re-syncs.
6. **`vercel.json`** — `{ "crons": [{ "path": "/api/cron/sync-all", "schedule": "0 */6 * * *" }] }`.
7. **`src/app/(app)/connections/snaptrade/callback/page.tsx`** — receives the SnapTrade portal redirect, lists new authorizations, inserts rows, triggers initial sync.
8. **`src/app/(app)/settings/category-mapping/page.tsx`** — UI to edit `plaidCategoryMap` rows; seed sensible defaults.
9. **React Plaid Link wiring** in `/connections` — replace the empty state's CTA with a button that opens Plaid Link via `react-plaid-link`.

Prerequisites:
- Generate `ENCRYPTION_KEY` (`openssl rand -base64 32`), `CRON_SECRET` (any random string).
- Plaid account (Sandbox is free; Production needs an access request).
- SnapTrade account (50 connections/mo free).

Estimated effort: 1–2 focused days for someone familiar with the SDKs.

---

## 17. Continuing development on a different machine

You absolutely can. Two paths:

### Path A — Manual continuation

On the new machine:

```bash
git clone https://github.com/rayancheca/finance-tracker-.git
cd finance-tracker-
# `main` has v1; `git checkout p2/ux-polish` for the P2 work (PR #2) until it's merged
npm install
cp .env.example .env.local
# Edit .env.local with your existing Neon + Clerk keys
npm run dev
```

That's it. Your Neon DB and Clerk app are server-side, so they follow you across machines. Your data persists. Everything that wasn't pushed (the `.env.local` file) needs to be recreated, but you have the keys in the Neon / Clerk / Vercel dashboards.

Then open `BUILD_LOG.md` and pick up wherever you want.

### Path B — Hand it to a fresh Claude session

I've added a [`CONTINUE.md`](./CONTINUE.md) file in the repo. The first time you start a new Claude (Code, Web, whatever) on the Mac, paste the contents of `CONTINUE.md` as your first message. It contains:

- The original build context.
- The exact delivery state.
- The to-do list (Phase 11.5 + Playwright + UX polish).
- Conventions to follow.
- "Start here" instructions.

The next Claude will read it, understand what was built, and pick up cleanly.

### What you'll need on the Mac

- Node 20 (`brew install node@20` or via `nvm`)
- Git (`brew install git`)
- The same env vars (re-copy them out of Vercel into a fresh `.env.local`)
- Your Clerk + Neon + Vercel account credentials

That's it. No DB migration needed — the schema is already in Neon, your data is already there.

---

## 18. Troubleshooting

### "DATABASE_URL is not set"

You forgot `.env.local`. Run `cp .env.example .env.local` and fill it in.

### "The publishableKey passed to Clerk is invalid"

Your `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is malformed. It should start with `pk_test_` or `pk_live_`. Copy fresh from Clerk dashboard.

### `npm run db:push` hangs / fails

- Check `DATABASE_URL` has `?sslmode=require` at the end.
- Confirm the Neon project isn't paused (free tier auto-suspends after 5 min idle; the first connection wakes it up but takes a few seconds).

### Sign-in works but dashboard is empty

Seeding didn't run. Check `users` table in Drizzle Studio. If your row is missing, the provisioning step failed — look at server logs. If your row exists but tables are empty, manually run:

```bash
npm run db:seed <your_clerk_user_id>
```

### "Module not found" after pulling latest

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build fails in Vercel with Clerk errors

You probably forgot to add Clerk env vars in the Vercel dashboard. Add them under Settings → Environment Variables for both Production and Preview, then redeploy.

### Tax calculator numbers look off

The tax calculator uses 2025 brackets hard-coded in `src/lib/tax.ts`. If a future year diverges materially, update the bracket constants. The unit tests in `tests/unit/tax.test.ts` lock in the workbook's reference values — they'll fail loudly if the math drifts.

---

## 19. Status & what's left

### ✅ Done — v1 (Phases 0–13)

- Bootstrap, pinned deps, configs (TS strict, ESLint, Prettier, Tailwind, Drizzle, Vitest, Playwright)
- Full Drizzle schema (12 tables, 9 enums), incl. the Phase 11.5 columns
- Idempotent seed (5 accounts, 46 categories, 6 goals, 24 settings)
- Clerk middleware + auth helpers + first-run provisioning
- Sidebar + Header + MobileNav layout (light/dark)
- All app pages (Dashboard, Transactions list/new/edit/import, Categories, Accounts, Goals + detail, Net Worth + Holdings, Recurring, Lease, Tax Calculator, Reports monthly + annual, Settings, Connections shell)
- All server actions (CRUD + bulk + import + contribute + bulkSnapshot + postRecurring + updateSettings)
- CSV + XLSX export endpoints
- AES-256-GCM token encryption helpers
- 43 unit tests, all passing

### ✅ Done — P2 UX polish (PR #2)

Each item is a separate commit; `typecheck` + `lint` + `test` (43/43) + production `build` all clean. **No new runtime dependencies** — the new code adds shadcn-style `checkbox` / `popover` / `command` / `empty-state` primitives over libraries (`@dnd-kit/*`, `@radix-ui/react-checkbox`, `@radix-ui/react-popover`, `cmdk`) that were already declared.

- **Drag-to-reorder categories** on `/categories` (`@dnd-kit`, optimistic + rollback, keyboard-operable).
- **Inline category edit** on the transactions table (Popover + `cmdk` combobox, scoped to the row's type).
- **Bulk-select + sticky toolbar** on `/transactions` (delete / set category / mark cleared).
- **Account detail page** `/accounts/[id]` (balance-over-time chart + direction-aware recent activity).
- **Empty-state illustrations** across every list page.
- **Review hardening:** server-side category-kind validation in `bulkUpdateCategory`; stale-selection pruning; trimmed client RSC payloads (no `userId`/timestamps shipped to the browser); an accessible name on the auto-sync icon.

### ✅ Done — local dev mode + screenshots

- **Zero-cloud `LOCAL_DEV` mode** ([§ 2.4](#24-running-locally-zero-cloud--capturing-screenshots)): a `NEXT_PUBLIC_LOCAL_DEV` flag swaps the DB layer to a local Postgres (`pg`) and replaces Clerk with a fixed dev user. Gated so production stays on Neon + Clerk, verified by the placeholder-creds production build.
- **Screenshots** captured from a live local run (light + dark) via a committed `scripts/capture-screenshots.mjs`, embedded in [§ 2.1](#21-screenshots).

### ✅ Done — editable data + live holdings

- **Account / card CRUD from the UI** (add on `/accounts`, edit / archive / delete on the detail page) — the seeded demo accounts can be replaced with real ones, balances and all.
- **Holdings + live market data:** add positions or import a CSV (ticker + shares); current price, market value, and % of portfolio are computed from **live Yahoo Finance quotes** (`yahoo-finance2`) and refresh on demand. Holdings upsert on (account, symbol). Verified end-to-end against real quotes in local dev.

### 🚧 What's left

| Area | State | Blocked on |
| --- | --- | --- |
| **Playwright e2e suite (P1)** | `playwright.config.ts` present; **no specs written**, and `@clerk/testing` is **not** installed. | The DB + non-auth flows can now run under `LOCAL_DEV` (no cloud). The `auth` spec (sign-in/out, redirects) still needs a real **Clerk dev instance** + `@clerk/testing`. Then write the `transactions` / `dashboard` / `settings` / `goals` / `import` specs and get them green. |
| **Phase 11.5 — live aggregation** | Schema, crypto, and the `/connections` shell are in; SDK glue is not. Full work list: [§ 16](#16-phase-115--live-aggregation-plaid--snaptrade). | Plaid + SnapTrade **API keys**, plus `ENCRYPTION_KEY` and `CRON_SECRET`. On hold by request — needs live credentials to be testable. |
| **Deploy to Vercel (Phase 14)** | Not started. Steps: [§ 15](#15-deploying-to-vercel). | Vercel auth + a production Neon DB + env vars. |
| **P3 nice-to-haves** | Not started. | Nothing external — see below. |

#### P3 — nice-to-haves (no external dependencies)

- Goal contribution can optionally create a matching savings transaction.
- "Post Due Today" action on `/recurring` for `autoPost` entries.
- Lease "what-if release on date X" interactive picker on `/lease`.
- Tax calculator: bracket-bar visualization; a "save settings" diff preview.
- Reports: heatmap conditional formatting on the monthly pivot; a year-over-year comparison row on the annual report.

#### Known, intentionally deferred

- The `/accounts/[id]` balance chart's final point can diverge from the headline balance — but **only once Phase 11.5 sync populates `lastReportedBalance` / `lastBalanceSync`** (nothing writes those today, so it's dormant). It rides along with the Phase 11.5 work rather than being fixed speculatively.

### Acceptance checklist (spec § 15)

See `BUILD_LOG.md` for the full checklist with current state.

---

## 20. Disclaimers

- **Tax calculator is informational only.** Not tax advice. Verify with the IRS or a tax professional before filing.
- **State income tax** uses simplified flat rates (FL/TX/WA/NV = 0%; NY/NJ/CA/MA approximations). Brackets, credits, and deductions are not modeled.
- **Auto-sync (when enabled)** can lag, miss recurring transactions, or temporarily disconnect when banks update security. Treat synced data as a starting point — review categorizations. Your manual edits always win over future sync updates.
- **Robinhood activity** (buys/sells/dividends) intentionally does NOT flow into the main transactions table. If/when Phase 11.5 is enabled, it lives on the brokerage account's Activity tab.
- **Market data** for holdings comes from public Yahoo Finance endpoints via `yahoo-finance2`. It is delayed/unofficial, has no SLA, and is for personal tracking only — not for trading decisions. Prices update only when you hit **Refresh prices**.
- **Single user.** The schema supports adding more users, but the UI does not surface anything multi-user. Don't share your sign-in.
