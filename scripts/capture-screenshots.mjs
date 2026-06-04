// Captures the golden-path screenshots against a running LOCAL_DEV server.
//
//   npm run dev            # in one shell (with NEXT_PUBLIC_LOCAL_DEV=1)
//   node scripts/capture-screenshots.mjs
//
// Writes PNGs to docs/screenshots/. Requires the local demo data to be loaded.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = 'docs/screenshots';
const VIEWPORT = { width: 1440, height: 960 };

async function settleCharts(page) {
  await page.locator('.recharts-surface').first().waitFor({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function shot(browser, { path, name, theme = 'light', fullPage = true, prepare }) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, colorScheme: theme });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);
  await settleCharts(page);
  if (prepare) await prepare(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log('captured', name);
  await ctx.close();
}

const shots = [
  { path: '/', name: '01-dashboard-light', theme: 'light' },
  { path: '/', name: '01-dashboard-dark', theme: 'dark' },
  {
    path: '/transactions',
    name: '02-transactions-bulk-toolbar',
    fullPage: false,
    prepare: async (page) => {
      const cbs = page.locator('tbody button[role="checkbox"]');
      const n = Math.min(3, await cbs.count());
      for (let i = 0; i < n; i++) await cbs.nth(i).click();
      await page.waitForTimeout(500);
    },
  },
  {
    path: '/transactions',
    name: '02b-transactions-inline-category',
    fullPage: false,
    prepare: async (page) => {
      await page.locator('button[aria-label="Change category"]').first().click();
      await page.waitForTimeout(600);
    },
  },
  { path: '/categories', name: '03-categories-reorder' },
  { path: '/accounts', name: '04-accounts' },
  {
    path: '/accounts',
    name: '05-account-detail-light',
    theme: 'light',
    prepare: async (page) => {
      await page.locator('a[href^="/accounts/"]').first().click();
      await page.waitForLoadState('networkidle');
      await settleCharts(page);
    },
  },
  {
    path: '/accounts',
    name: '05-account-detail-dark',
    theme: 'dark',
    prepare: async (page) => {
      await page.locator('a[href^="/accounts/"]').first().click();
      await page.waitForLoadState('networkidle');
      await settleCharts(page);
    },
  },
  { path: '/goals', name: '06-goals' },
  { path: '/net-worth', name: '07-net-worth-trend' },
  { path: '/reports/monthly', name: '08-reports-monthly' },
  { path: '/tax-calculator', name: '09-tax-calculator' },
];

const browser = await chromium.launch();
await mkdir(OUT, { recursive: true });
for (const s of shots) {
  try {
    await shot(browser, s);
  } catch (e) {
    console.error('FAILED', s.name, e.message);
  }
}
await browser.close();
console.log('done');
