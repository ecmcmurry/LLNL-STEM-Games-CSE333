//Claude generated file to assist in website perfomance testing
/**
 * platform.perf.test.js
 * Baseline performance measurements for the full AI Arcademia website.
 *
 * Uses the browser Navigation Timing Level 2 API to record TTFB,
 * DOMContentLoaded, full load time, and HTML transfer size for every
 * root-level page. Also measures client-side navigation transition times
 * for the primary desktop and mobile happy-path flows.
 *
 * Run with:
 *   npx playwright test --config platform.playwright.config.js
 */

const { test, expect } = require('@playwright/test');

// Budget thresholds (ms / bytes) — generous for a locally-served static site.
const LOAD_BUDGET_MS    = 2000;
const DCL_BUDGET_MS     = 1000;
const NAV_BUDGET_MS     = 3000;
const SIZE_BUDGET_BYTES = 512_000; // 500 KB

/** Reads Navigation Timing Level 2 metrics from the current page. */
async function getNavTiming(page) {
  return page.evaluate(() => {
    const [entry] = performance.getEntriesByType('navigation');
    if (!entry) return null;
    return {
      ttfb:             entry.responseStart - entry.requestStart,
      domInteractive:   entry.domInteractive - entry.startTime,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.startTime,
      load:             entry.loadEventEnd - entry.startTime,
      transferSize:     entry.transferSize,
    };
  });
}

// ─── Page load budgets — all root pages ───────────────────────────────────────

test.describe('Page load budgets', () => {
  const PAGES = [
    { path: '/index.html',       label: 'Landing page'   },
    { path: '/science.html',     label: 'Science'        },
    { path: '/technology.html',  label: 'Technology'     },
    { path: '/engineering.html', label: 'Engineering'    },
    { path: '/math.html',        label: 'Math'           },
    { path: '/game.html?game=Adrian%20Games/Game1/index.html&title=Test&author=Test&from=science.html',
      label: 'Game wrapper' },
  ];

  for (const { path, label } of PAGES) {
    test(`${label} (${path.replace(/\?.*/, '')}) full load is under ${LOAD_BUDGET_MS} ms`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      const t = await getNavTiming(page);
      expect(t).not.toBeNull();
      console.log(
        `[perf] ${label}  TTFB: ${t.ttfb.toFixed(0)}ms | ` +
        `DCL: ${t.domContentLoaded.toFixed(0)}ms | ` +
        `load: ${t.load.toFixed(0)}ms | ` +
        `transfer: ${(t.transferSize / 1024).toFixed(1)}KB`
      );
      expect(t.load).toBeGreaterThan(0);
      expect(t.load).toBeLessThan(LOAD_BUDGET_MS);
    });
  }

  test('landing page DOMContentLoaded is under budget', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    const t = await getNavTiming(page);
    expect(t.domContentLoaded).toBeLessThan(DCL_BUDGET_MS);
  });
});

// ─── Transfer size — all root pages ───────────────────────────────────────────

test.describe('Transfer size', () => {
  const PAGES = [
    '/index.html', '/science.html', '/technology.html', '/engineering.html', '/math.html',
  ];

  for (const path of PAGES) {
    test(`${path} HTML transfer is under ${SIZE_BUDGET_BYTES / 1024} KB`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      const t = await getNavTiming(page);
      console.log(`[perf] ${path} transfer: ${(t.transferSize / 1024).toFixed(1)}KB`);
      expect(t.transferSize).toBeLessThan(SIZE_BUDGET_BYTES);
    });
  }
});

// ─── Navigation transition timing ─────────────────────────────────────────────

test.describe('Navigation transition timing', () => {
  // Desktop: click a game card on the landing page
  test('landing → game wrapper via desktop card is under budget', async ({ page }) => {
    await page.goto('/index.html');
    const card = page.locator('.desktop-card[href*="game.html"]').first();
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/game\.html/),
      card.click(),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] landing→game (desktop card): ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Mobile Science flow
  test('mobile landing → science.html is under budget', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/index.html');
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/science\.html/),
      page.click('#main-nav a[href="science.html"]'),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] mobile landing→science: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Mobile Technology flow
  test('mobile landing → technology.html is under budget', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto('/index.html');
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/technology\.html/),
      page.click('#main-nav a[href="technology.html"]'),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] mobile landing→technology: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Science category → game wrapper
  test('science.html → game wrapper is under budget', async ({ page }) => {
    await page.goto('/science.html');
    const link = page.locator('.game a[href*="game.html"]').first();
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/game\.html/),
      link.click(),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] science→game wrapper: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Technology category → game wrapper
  test('technology.html → game wrapper is under budget', async ({ page }) => {
    await page.goto('/technology.html');
    const link = page.locator('.game a[href*="game.html"]').first();
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/game\.html/),
      link.click(),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] technology→game wrapper: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Engineering category → game wrapper
  test('engineering.html → game wrapper is under budget', async ({ page }) => {
    await page.goto('/engineering.html');
    const link = page.locator('.game a[href*="game.html"]').first();
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/game\.html/),
      link.click(),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] engineering→game wrapper: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Math category → game wrapper
  test('math.html → game wrapper is under budget', async ({ page }) => {
    await page.goto('/math.html');
    const link = page.locator('.game a[href*="game.html"]').first();
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/game\.html/),
      link.click(),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] math→game wrapper: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });

  // Back link returns
  test('game wrapper → science.html back link is under budget', async ({ page }) => {
    await page.goto('/game.html?game=Adrian%20Games/Game1/index.html&title=T&author=A&from=science.html');
    const start = Date.now();
    await Promise.all([
      page.waitForURL(/science\.html/),
      page.click('#back-link'),
    ]);
    const elapsed = Date.now() - start;
    console.log(`[perf] game→science (back): ${elapsed}ms`);
    expect(elapsed).toBeLessThan(NAV_BUDGET_MS);
  });
});

// ─── TTFB sanity check ────────────────────────────────────────────────────────

test.describe('Time to First Byte', () => {
  const PAGES = [
    '/index.html', '/science.html', '/technology.html', '/engineering.html', '/math.html',
  ];

  for (const path of PAGES) {
    test(`${path} TTFB is non-negative`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      const t = await getNavTiming(page);
      expect(t.ttfb).toBeGreaterThanOrEqual(0);
    });
  }
});
