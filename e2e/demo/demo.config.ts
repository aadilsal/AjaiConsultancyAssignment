import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Records the walkthrough video; output lives outside the repo on purpose.
export const VIDEO_DIR = process.env.DEMO_VIDEO_DIR ?? path.resolve(__dirname, '../../../ajaia-demo-video');

export default defineConfig({
  testDir: __dirname,
  testMatch: 'record-demo.spec.ts',
  timeout: 6 * 60_000,
  workers: 1,
  reporter: 'list',
  outputDir: path.join(VIDEO_DIR, 'raw'),
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://docs.51-170-90-86.sslip.io',
    viewport: { width: 1440, height: 900 },
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    colorScheme: 'light',
    actionTimeout: 15_000,
  },
});
