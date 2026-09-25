import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// E2E runs against the Docker-free local stack (PostgREST + Supabase Auth +
// gateway) seeded with demo data:  npm run stack:setup && npm run test:e2e
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const chromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "uz-UZ",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: existsSync(chromium) && !process.env.PLAYWRIGHT_BROWSERS_PATH ? { executablePath: chromium } : {} } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        { command: "node scripts/local-stack/start.mjs", url: "http://localhost:54321/rest/v1/", reuseExistingServer: true, timeout: 60_000 },
        { command: "node scripts/e2e-server.mjs", url: `${baseURL}/api/health`, reuseExistingServer: true, timeout: 180_000 },
      ],
});
