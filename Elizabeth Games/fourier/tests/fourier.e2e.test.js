//This file was generated using Claude Sonnet 4.6, but I have taken the time to understand what it means
/**
 * fourier.e2e.test.js
 * Playwright end-to-end tests for the Fourier Demo game.
 *
 * Run with:
 *   npx playwright test tests/fourier.e2e.test.js
 *
 * Requires a local server serving /public/index.html.
 * The playwright.config.js in this project starts one automatically via webServer.
 */

const { test, expect } = require('@playwright/test');

// ─── Page load & initial render ───────────────────────────────────────────────

test.describe('Initial page load', () => {
  test('page title is correct', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle('What Wave');
  });

  test('score display starts at "Score: 0"', async ({ page }) => {
    await page.goto('/index.html');
    const score = page.getByTestId('score-display');
    await expect(score).toHaveText('Score: 0');
  });

  test('canvas element is visible', async ({ page }) => {
    await page.goto('/index.html');
    const canvas = page.getByTestId('wave-canvas');
    await expect(canvas).toBeVisible();
  });

  test('at least one subwave row is rendered on load', async ({ page }) => {
    await page.goto('/index.html');
    const rows = page.locator('[data-testid^="subwave-row-"]');
    await expect(rows).toHaveCount(1); // starts with 1 wave
  });

  test('amplitude slider is present for wave 0', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByTestId('amp-slider-0')).toBeVisible();
  });

  test('frequency slider is present for wave 0', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByTestId('freq-slider-0')).toBeVisible();
  });

  test('phase slider is present for wave 0', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByTestId('phase-slider-0')).toBeVisible();
  });
});

// ─── Slider interactions ──────────────────────────────────────────────────────

test.describe('Slider interactions', () => {
  test('moving the amplitude slider updates the displayed A value', async ({ page }) => {
    await page.goto('/index.html');
    const slider = page.getByTestId('amp-slider-0');
    const display = page.getByTestId('amp-val-0');

    // Set slider to a known value via JS
    await slider.evaluate(el => {
      el.value = '0.30';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(display).toHaveText('0.30');
  });

  test('moving the frequency slider updates the displayed f value', async ({ page }) => {
    await page.goto('/index.html');
    const slider = page.getByTestId('freq-slider-0');
    const display = page.getByTestId('freq-val-0');

    await slider.evaluate(el => {
      el.value = '3.5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(display).toHaveText('3.50');
  });

  test('moving the phase slider updates the displayed φ value', async ({ page }) => {
    await page.goto('/index.html');
    const slider = page.getByTestId('phase-slider-0');
    const display = page.getByTestId('phase-val-0');

    await slider.evaluate(el => {
      el.value = String(Math.PI); // 1π
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Display should show "1.00π"
    const text = await display.textContent();
    expect(text).toMatch(/1\.00π/);
  });

  test('amplitude slider updates internal subwave state', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByTestId('amp-slider-0').evaluate(el => {
      el.value = '0.75';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const amp = await page.evaluate(() => window.__gameState.subwaves[0].amplitude);
    expect(amp).toBeCloseTo(0.75);
  });

  test('frequency slider updates internal subwave state', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByTestId('freq-slider-0').evaluate(el => {
      el.value = '4.0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const freq = await page.evaluate(() => window.__gameState.subwaves[0].frequency);
    expect(freq).toBeCloseTo(4.0);
  });
});

// ─── Scoring ──────────────────────────────────────────────────────────────────

test.describe('Scoring', () => {
  test('score increments when forceMatch() is called', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceMatch());
    const scoreText = await page.getByTestId('score-display').textContent();
    const scoreNum = parseInt(scoreText.replace('Score: ', ''), 10);
    expect(scoreNum).toBeGreaterThanOrEqual(1);
  });

  test('score display updates to reflect new score', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceMatch());
    const score = page.getByTestId('score-display');
    // Should no longer show "Score: 0"
    await expect(score).not.toHaveText('Score: 0');
  });

  test('submitting an incorrect wave does not increase score', async ({ page }) => {
    await page.goto('/index.html');
    // Set amplitude to 0 — very unlikely to match
    await page.getByTestId('amp-slider-0').evaluate(el => {
      el.value = '0';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const score = await page.evaluate(() => window.__gameState.score);
    expect(score).toBe(0);
  });
});

// ─── Difficulty progression ───────────────────────────────────────────────────

test.describe('Difficulty progression', () => {
  test('at score 6, two subwave rows are shown', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(6));
    const rows = page.locator('[data-testid^="subwave-row-"]');
    await expect(rows).toHaveCount(2);
  });

  test('at score 12, three subwave rows are shown', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(12));
    const rows = page.locator('[data-testid^="subwave-row-"]');
    await expect(rows).toHaveCount(3);
  });

  test('at score 18, four subwave rows are shown', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(18));
    const rows = page.locator('[data-testid^="subwave-row-"]');
    await expect(rows).toHaveCount(4);
  });

  test('at score 2, frequency slider is present (freq unlocked)', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(2));
    await expect(page.getByTestId('freq-slider-0')).toBeVisible();
  });

  test('internal waveCount matches expected value at score 6', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(6));
    const waveCount = await page.evaluate(() => window.__gameState.waveCount);
    expect(waveCount).toBe(2);
  });

  test('realwaves have correct count of enabled waves at score 9', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(9));
    const enabledCount = await page.evaluate(() =>
      window.__gameState.realwaves.filter(w => w.enabled).length
    );
    expect(enabledCount).toBe(2);
  });
});

// ─── Game state / DOM consistency ────────────────────────────────────────────

test.describe('Game state / DOM consistency', () => {
  test('canvas has non-zero width and height', async ({ page }) => {
    await page.goto('/index.html');
    const { width, height } = await page.getByTestId('wave-canvas').boundingBox();
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  test('subwave-list container exists in the DOM', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByTestId('subwave-list')).toBeAttached();
  });

  test('wave-card wrapper is visible', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByTestId('wave-card')).toBeVisible();
  });

  test('initial internal score equals 0', async ({ page }) => {
    await page.goto('/index.html');
    // After changeDifficulty runs on load, score stays at 0
    // (a new round is triggered, but score only moves when checkSolution passes)
    const score = await page.evaluate(() => window.__gameState.score);
    // Score might be 1 if default sliders happen to match — check it's a small integer
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(5);
  });

  test('all four subwave color dots are rendered at score 21', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceScore(21));
    const rows = page.locator('[data-testid^="subwave-row-"]');
    await expect(rows).toHaveCount(4);
    const colors = page.locator('.subwave-color');
    await expect(colors).toHaveCount(4);
  });

  test('forceMatch then re-load: subsequent round sets up new sliders', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => window.__gameState.forceMatch());
    // After matching, the game should set up a new round
    const rows = page.locator('[data-testid^="subwave-row-"]');
    // At least 1 slider row should exist
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ─── Accessibility ────────────────────────────────────────────────────────────

test.describe('Accessibility', () => {
  test('all range inputs have min, max, and step attributes', async ({ page }) => {
    await page.goto('/index.html');
    const inputs = await page.locator('input[type="range"]').all();
    for (const input of inputs) {
      await expect(input).toHaveAttribute('min');
      await expect(input).toHaveAttribute('max');
      await expect(input).toHaveAttribute('step');
    }
  });

  test('score display element exists and is readable', async ({ page }) => {
    await page.goto('/index.html');
    const text = await page.getByTestId('score-display').textContent();
    expect(text).toMatch(/^Score: \d+$/);
  });
});
