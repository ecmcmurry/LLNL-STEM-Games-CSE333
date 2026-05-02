//Claude generated file to assist in website perfomance testing
// Playwright config for the AI Arcademia main platform (root site).
// Run with: npx playwright test --config platform.playwright.config.js
// Serves the repo root on port 3334 so tests can reach index.html, science.html, game.html, etc.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/platform.*.test.js',
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3334',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Serves the repo root via a minimal built-in Node server (no clean-URL rewrites).
  webServer: {
    command: 'node platform-server.js',
    url: 'http://localhost:3334',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-platform', open: 'never' }],
  ],
});