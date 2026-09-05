import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke-test config. Separate from vitest, which stays unit-only and runs in
 * a node environment (see vitest.config.ts).
 *
 * Needs a signed-in admin. Set these in .env.local or CI secrets:
 *   E2E_BASE_URL        default http://localhost:3000
 *   E2E_ADMIN_EMAIL
 *   E2E_ADMIN_PASSWORD
 *
 * Without them the suite skips rather than failing, so a fresh clone stays
 * green. Point E2E_BASE_URL at a preview deployment to skip the local build.
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/smoke",
  // Route sweeps are IO-bound; a little parallelism, but not enough to make
  // the admin session or the database the bottleneck.
  workers: process.env.CI ? 2 : 4,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "smoke",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/smoke/.auth/admin.json",
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
