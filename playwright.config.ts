import { defineConfig, devices } from '@playwright/test';

// React-only e2e: single chromium project against the Vite React demo.
const reactDevServer = {
  command: 'bun run dev:react',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
  timeout: 60 * 1000,
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use 4 workers locally for faster execution, 1 in CI for stability
  workers: process.env.CI ? 1 : 4,
  // Default timeout of 30s per test (can override with --timeout flag)
  timeout: 30000,
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
  reporter: [
    ['list'],
    // Only generate HTML report in CI or when explicitly requested
    ...(process.env.CI || process.env.HTML_REPORT ? [['html', { open: 'never' }] as const] : []),
  ],

  use: {
    baseURL: 'http://localhost:5173',
    // Only trace/screenshot on failure to speed up passing tests
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Faster action timeouts
    actionTimeout: 10000,
    navigationTimeout: 15000,
    // Grant clipboard permissions for copy/paste tests
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run the React dev server before tests */
  webServer: [reactDevServer],

  /* Output directory for screenshots */
  outputDir: './screenshots/test-results',
});
