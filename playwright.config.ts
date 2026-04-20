import 'dotenv/config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  retries: 1,
  workers: 1,
  reporter: [
    ['html', { open: 'on-failure' }],
  ],
  use: {
    headless: false,
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'system-chrome',
      use: {
        browserName: 'chromium',
        launchOptions: {
          executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        },
      },
    },
  ],
});