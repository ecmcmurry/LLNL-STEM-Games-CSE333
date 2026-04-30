// playwright.config.js
const { defineConfig } = require('@playwright/test');
 
module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.test.js',
  timeout: 30_000,
 
  use: {
    baseURL: 'http://localhost:3333',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
 
  // Spins up a static server for the root folder before running tests.
  // Requires: npm install --save-dev serve   (or any static server)
  webServer: {
    command: 'npx serve . -p 3333 --no-clipboard',
    url: 'http://localhost:3333',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
 
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    // Uncomment to add more browsers:
    // { name: 'firefox',  use: { browserName: 'firefox' } },
    // { name: 'webkit',   use: { browserName: 'webkit'  } },
  ],
 
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
});
