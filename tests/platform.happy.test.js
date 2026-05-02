//Claude generated file to assist in website perfomance testing
/**
 * platform.happy.test.js
 * End-to-end happy-path tests for the full AI Arcademia website.
 *
 * Covers every page served from the root index.html:
 *   - index.html   : desktop (≥769 px) and mobile (<769 px) layouts
 *   - science.html / technology.html / engineering.html / math.html
 *   - game.html    : parameter-driven title, author, iframe, HTP cards
 *
 * Desktop layout uses .hero-section + .stem-strip + .games-section.
 * Mobile layout uses .top-bar (#logo) + #main-nav + #sidebar.
 * Both layouts share the same theme toggle (#theme-toggle).
 *
 * Run with:
 *   npx playwright test --config platform.playwright.config.js
 */

const { test, expect } = require('@playwright/test');

// ─── Landing page — desktop layout ────────────────────────────────────────────

test.describe('Landing page (desktop)', () => {
  test('page title is "AI Arcademia"', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page).toHaveTitle('AI Arcademia');
  });

  test('hero title animates to "AI Arcademia"', async ({ page }) => {
    await page.goto('/index.html');
    // The typing animation runs at 110 ms per char; allow up to 5 s for completion.
    await expect(page.locator('.hero-title')).toContainText('AI Arcademia', { timeout: 5000 });
  });

  test('STEM strip renders exactly 4 letter tiles', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.stem-strip-letter')).toHaveCount(4);
  });

  test('STEM strip tiles carry correct data-cat attributes (s, t, e, m)', async ({ page }) => {
    await page.goto('/index.html');
    for (const cat of ['s', 't', 'e', 'm']) {
      await expect(page.locator(`.stem-strip-letter[data-cat="${cat}"]`)).toBeVisible();
    }
  });

  test('games section contains 4 category columns', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.games-col')).toHaveCount(4);
  });

  test('total desktop game cards on landing page is 9', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.desktop-card')).toHaveCount(9);
  });

  test('theme toggle button is visible', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('"About" link in hero section navigates to about.html', async ({ page }) => {
    await page.goto('/index.html');
    const href = await page.locator('.about-btn').getAttribute('href');
    expect(href).toContain('about.html');
  });
});

// ─── Desktop STEM strip: selectCategory interaction ───────────────────────────

test.describe('Desktop STEM strip — selectCategory', () => {
  test('clicking S tile gives it stem-active and dims others', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('.stem-strip-letter[data-cat="s"]');
    await expect(page.locator('.stem-strip-letter[data-cat="s"]')).toHaveClass(/stem-active/);
    for (const cat of ['t', 'e', 'm']) {
      await expect(page.locator(`.stem-strip-letter[data-cat="${cat}"]`)).toHaveClass(/stem-dimmed/);
    }
  });

  test('clicking S tile dims non-S game columns and activates S column', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('.stem-strip-letter[data-cat="s"]');
    await expect(page.locator('.games-col[data-cat="s"]')).toHaveClass(/stem-active/);
    for (const cat of ['t', 'e', 'm']) {
      await expect(page.locator(`.games-col[data-cat="${cat}"]`)).toHaveClass(/stem-dimmed/);
    }
  });

  test('clicking active S tile a second time clears all active/dimmed classes', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('.stem-strip-letter[data-cat="s"]');
    await page.click('.stem-strip-letter[data-cat="s"]'); // toggle off
    for (const cat of ['s', 't', 'e', 'm']) {
      const tile = page.locator(`.stem-strip-letter[data-cat="${cat}"]`);
      await expect(tile).not.toHaveClass(/stem-active/);
      await expect(tile).not.toHaveClass(/stem-dimmed/);
    }
  });

  test('switching from S to T resets S and activates T', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('.stem-strip-letter[data-cat="s"]');
    // After selectCategory('s') runs a smooth-scroll, the sticky .stem-strip
    // parent intercepts pointer events so a normal click on T is blocked.
    // dispatchEvent sends the click directly to the element, bypassing routing.
    await page.locator('.stem-strip-letter[data-cat="t"]').dispatchEvent('click');
    await expect(page.locator('.stem-strip-letter[data-cat="t"]')).toHaveClass(/stem-active/);
    await expect(page.locator('.stem-strip-letter[data-cat="s"]')).toHaveClass(/stem-dimmed/);
  });
});

// ─── Desktop game card inventory ──────────────────────────────────────────────

test.describe('Desktop game card inventory', () => {
  test('Science column: 3 cards including Physics Game Lab and Sound and Valid', async ({ page }) => {
    await page.goto('/index.html');
    const col = page.locator('.games-col[data-cat="s"]');
    await expect(col.locator('.desktop-card')).toHaveCount(3);
    await expect(col.locator('.dc-title', { hasText: 'Physics Game Lab' })).toBeVisible();
    await expect(col.locator('.dc-title', { hasText: 'Sound and Valid' })).toBeVisible();
  });

  test('Technology column: 2 cards including Bug in the Flower and 8 Bit Circuit', async ({ page }) => {
    await page.goto('/index.html');
    const col = page.locator('.games-col[data-cat="t"]');
    await expect(col.locator('.desktop-card')).toHaveCount(2);
    await expect(col.locator('.dc-title', { hasText: "There's a Bug in the Flower!" })).toBeVisible();
    await expect(col.locator('.dc-title', { hasText: '8 Bit Circuit' })).toBeVisible();
  });

  test('Engineering column: 2 cards including Forge & Fortune and StructureStrike', async ({ page }) => {
    await page.goto('/index.html');
    const col = page.locator('.games-col[data-cat="e"]');
    await expect(col.locator('.desktop-card')).toHaveCount(2);
    await expect(col.locator('.dc-title', { hasText: 'Forge' })).toBeVisible();
    await expect(col.locator('.dc-title', { hasText: 'StructureStrike' })).toBeVisible();
  });

  test('Math column: 2 cards including What Wave and Feed The Function', async ({ page }) => {
    await page.goto('/index.html');
    const col = page.locator('.games-col[data-cat="m"]');
    await expect(col.locator('.desktop-card')).toHaveCount(2);
    await expect(col.locator('.dc-title', { hasText: 'What Wave' })).toBeVisible();
    await expect(col.locator('.dc-title', { hasText: 'Feed The Function' })).toBeVisible();
  });

  test('every non-disabled desktop card has an href pointing to game.html', async ({ page }) => {
    await page.goto('/index.html');
    const links = page.locator('.desktop-card[href*="game.html"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toContain('game.html');
      expect(href).toContain('title=');
      expect(href).toContain('author=');
    }
  });
});

// ─── Landing page — mobile layout ─────────────────────────────────────────────

test.describe('Landing page (mobile)', () => {
  test.use({ viewport: { width: 600, height: 900 } });

  test('mobile logo heading is visible', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#logo')).toBeVisible();
    await expect(page.locator('#logo')).toContainText('AI Arcademia');
  });

  test('all four mobile nav links are rendered', async ({ page }) => {
    await page.goto('/index.html');
    for (const href of ['science.html', 'technology.html', 'engineering.html', 'math.html']) {
      await expect(page.locator(`#main-nav a[href="${href}"]`)).toBeVisible();
    }
  });

  test('Science nav link navigates to science.html', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#main-nav a[href="science.html"]');
    await expect(page).toHaveURL(/science\.html/);
    await expect(page).toHaveTitle('Science Games');
  });

  test('Technology nav link navigates to technology.html', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#main-nav a[href="technology.html"]');
    await expect(page).toHaveURL(/technology\.html/);
    await expect(page).toHaveTitle('Technology Games');
  });

  test('Engineering nav link navigates to engineering.html', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#main-nav a[href="engineering.html"]');
    await expect(page).toHaveURL(/engineering\.html/);
    await expect(page).toHaveTitle('Engineering Games');
  });

  test('Math nav link navigates to math.html', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('#main-nav a[href="math.html"]');
    await expect(page).toHaveURL(/math\.html/);
    await expect(page).toHaveTitle('Math Games');
  });
});

// ─── All STEM category pages ───────────────────────────────────────────────────

test.describe('Science category page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/science.html');
    await expect(page).toHaveTitle('Science Games');
  });

  test('shows exactly 3 game cards', async ({ page }) => {
    await page.goto('/science.html');
    await expect(page.locator('.game')).toHaveCount(3);
  });

  test('first game card links to game.html', async ({ page }) => {
    await page.goto('/science.html');
    const href = await page.locator('.game a[href*="game.html"]').first().getAttribute('href');
    expect(href).toContain('game.html');
  });

  test('Back link returns to landing page', async ({ page }) => {
    await page.goto('/science.html');
    await page.click('a.back');
    await expect(page).toHaveURL(/index\.html/);
  });
});

test.describe('Technology category page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/technology.html');
    await expect(page).toHaveTitle('Technology Games');
  });

  test('shows exactly 2 game cards', async ({ page }) => {
    await page.goto('/technology.html');
    await expect(page.locator('.game')).toHaveCount(2);
  });

  test('includes Bug in the Flower game card', async ({ page }) => {
    await page.goto('/technology.html');
    await expect(page.locator('.game a', { hasText: "There's a Bug in the Flower!" })).toBeVisible();
  });

  test('Back link returns to landing page', async ({ page }) => {
    await page.goto('/technology.html');
    await page.click('a.back');
    await expect(page).toHaveURL(/index\.html/);
  });
});

test.describe('Engineering category page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/engineering.html');
    await expect(page).toHaveTitle('Engineering Games');
  });

  test('shows exactly 2 game cards', async ({ page }) => {
    await page.goto('/engineering.html');
    await expect(page.locator('.game')).toHaveCount(2);
  });

  test('includes StructureStrike game card', async ({ page }) => {
    await page.goto('/engineering.html');
    await expect(page.locator('.game a', { hasText: 'StructureStrike' })).toBeVisible();
  });

  test('Back link returns to landing page', async ({ page }) => {
    await page.goto('/engineering.html');
    await page.click('a.back');
    await expect(page).toHaveURL(/index\.html/);
  });
});

test.describe('Math category page', () => {
  test('loads with correct title', async ({ page }) => {
    await page.goto('/math.html');
    await expect(page).toHaveTitle('Math Games');
  });

  test('shows exactly 2 game cards', async ({ page }) => {
    await page.goto('/math.html');
    await expect(page.locator('.game')).toHaveCount(2);
  });

  test('includes What Wave game card', async ({ page }) => {
    await page.goto('/math.html');
    await expect(page.locator('.game a', { hasText: 'What Wave' })).toBeVisible();
  });

  test('Back link returns to landing page', async ({ page }) => {
    await page.goto('/math.html');
    await page.click('a.back');
    await expect(page).toHaveURL(/index\.html/);
  });
});

// ─── Game wrapper page ────────────────────────────────────────────────────────

// Builds a game.html URL from individual parts, matching the format used in real links.
function gameUrl(game, title, author, from) {
  return `/game.html?game=${encodeURIComponent(game)}&title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&from=${encodeURIComponent(from)}`;
}

test.describe('Game wrapper — core behaviour', () => {
  const URL = gameUrl('Adrian Games/Game1/index.html', 'Physics Game Lab', 'Adrian Botello', 'science.html');

  test('game title is rendered from URL param', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#game-title')).toHaveText('Physics Game Lab');
  });

  test('author badge is rendered from URL param', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#gameAuthor')).toHaveText('Adrian Botello');
  });

  test('iframe src resolves to the game path', async ({ page }) => {
    await page.goto(URL);
    const src = await page.locator('#game-frame').getAttribute('src');
    expect(src).toMatch(/Adrian.*Game1.*index\.html/i);
  });

  test('Back link href contains the "from" page', async ({ page }) => {
    await page.goto(URL);
    const href = await page.locator('#back-link').getAttribute('href');
    expect(href).toContain('science.html');
  });

  test('fullscreen button is visible', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#fullscreen-btn')).toBeVisible();
  });
});

test.describe('Game wrapper — How-to-Play cards', () => {
  const REGISTERED_GAMES = [
    { game: 'Adrian Games/Game1/index.html',               title: 'Physics Game Lab',       author: 'Adrian',    from: 'science.html' },
    { game: 'Adrian Games/Game2/Home.html',                title: '8 Bit Circuit',          author: 'Adrian',    from: 'technology.html' },
    { game: 'Hao Games/code_farm/index.html',              title: "There's a Bug!",         author: 'Hao',       from: 'technology.html' },
    { game: 'Ella Games/Game2Engineering/index.html',      title: 'Forge & Fortune',        author: 'Ella',      from: 'engineering.html' },
    { game: 'Eli Games/StructureStrike/dist/index.html',   title: 'StructureStrike',        author: 'Eli',       from: 'engineering.html' },
    { game: 'Elizabeth Games/fourier/index.html',          title: 'What Wave',              author: 'Elizabeth', from: 'math.html' },
    { game: 'Ella Games/GraphGame1/index.html',            title: 'Feed The Function',      author: 'Ella',      from: 'math.html' },
    { game: 'Eli Games/Sound and Valid/dist/index.html',   title: 'Sound and Valid',        author: 'Eli',       from: 'science.html' },
  ];

  for (const { game, title, from } of REGISTERED_GAMES) {
    test(`HTP section is visible for "${title}"`, async ({ page }) => {
      await page.goto(gameUrl(game, title, 'Test', from));
      await expect(page.locator('#how-to-play')).not.toHaveClass(/hidden/);
      await expect(page.locator('.htp-card')).toHaveCount(3);
    });
  }

  test('HTP section is hidden for an unregistered game', async ({ page }) => {
    await page.goto(gameUrl('nonexistent/game.html', 'Test', 'Test', 'index.html'));
    await expect(page.locator('#how-to-play')).toHaveClass(/hidden/);
  });

  test('HTP card titles are Controls, Objective, Tips', async ({ page }) => {
    const url = gameUrl('Adrian Games/Game1/index.html', 'Physics Game Lab', 'Adrian', 'science.html');
    await page.goto(url);
    const titles = page.locator('.htp-card-title');
    await expect(titles.nth(0)).toHaveText('Controls');
    await expect(titles.nth(1)).toHaveText('Objective');
    await expect(titles.nth(2)).toHaveText('Tips');
  });
});

// ─── Game wrapper — launched from each category page ─────────────────────────

test.describe('Game wrapper — category entry points', () => {
  test('Science → Physics Game Lab: game.html renders correctly', async ({ page }) => {
    await page.goto('/science.html');
    await page.click('.game a[href*="Game1"]');
    await expect(page.locator('#game-title')).not.toBeEmpty();
    await expect(page.locator('#gameAuthor')).not.toBeEmpty();
    await expect(page.locator('#fullscreen-btn')).toBeVisible();
  });

  test('Technology → code_farm: game.html renders correctly', async ({ page }) => {
    await page.goto('/technology.html');
    await page.click('.game a[href*="code_farm"]');
    await expect(page.locator('#game-title')).not.toBeEmpty();
    await expect(page.locator('#fullscreen-btn')).toBeVisible();
  });

  test('Engineering → StructureStrike: game.html renders correctly', async ({ page }) => {
    await page.goto('/engineering.html');
    await page.click('.game a[href*="StructureStrike"]');
    await expect(page.locator('#game-title')).not.toBeEmpty();
    await expect(page.locator('#fullscreen-btn')).toBeVisible();
  });

  test('Math → What Wave: game.html renders correctly', async ({ page }) => {
    await page.goto('/math.html');
    await page.click('.game a[href*="fourier"]');
    await expect(page.locator('#game-title')).not.toBeEmpty();
    await expect(page.locator('#fullscreen-btn')).toBeVisible();
  });
});

// ─── Dark / Light theme toggle ────────────────────────────────────────────────

test.describe('Theme toggle', () => {
  const PAGES = ['/index.html', '/science.html', '/technology.html', '/engineering.html', '/math.html', '/game.html?game=nonexistent&title=T&author=A&from=index.html'];

  for (const path of PAGES) {
    test(`theme toggle is present on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('.theme-toggle')).toBeVisible();
    });
  }

  test('clicking toggle on index.html adds light-mode to <html>', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('light-mode');
    });
    await page.click('#theme-toggle');
    expect(await page.evaluate(() => document.documentElement.className)).toContain('light-mode');
  });

  test('light-mode persists across page reload', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('light-mode');
    });
    await page.click('#theme-toggle');
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.className)).toContain('light-mode');
  });

  test('clicking toggle twice returns to dark mode', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('light-mode');
    });
    await page.click('#theme-toggle');
    await page.click('#theme-toggle');
    expect(await page.evaluate(() => document.documentElement.className)).not.toContain('light-mode');
  });

  test('theme toggle on science.html adds light-mode', async ({ page }) => {
    await page.goto('/science.html');
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      document.documentElement.classList.remove('light-mode');
    });
    await page.click('.theme-toggle');
    expect(await page.evaluate(() => document.documentElement.className)).toContain('light-mode');
  });
});
