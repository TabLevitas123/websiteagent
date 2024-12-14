import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests/compatibility',
  timeout: 30000,
  retries: 2,
  workers: 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/compatibility' }],
    ['junit', { outputFile: 'test-results/compatibility/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Chrome Latest',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
    },
    {
      name: 'Chrome Beta',
      use: {
        browserName: 'chromium',
        channel: 'chrome-beta',
      },
    },
    {
      name: 'Firefox Latest',
      use: {
        browserName: 'firefox',
      },
    },
    {
      name: 'Firefox ESR',
      use: {
        browserName: 'firefox',
        firefoxUserPrefs: {
          'app.update.channel': 'esr',
        },
      },
    },
    {
      name: 'Safari Latest',
      use: {
        browserName: 'webkit',
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        browserName: 'chromium',
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        browserName: 'webkit',
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'Tablet',
      use: {
        browserName: 'chromium',
        ...devices['iPad Pro 11'],
      },
    },
  ],
  webServer: {
    command: 'npm run start',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
};

export default config;
