import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  use: { baseURL: 'http://127.0.0.1:6006', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm storybook --ci --no-open', port: 6006, reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
