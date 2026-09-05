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
  // Two workers, everywhere. This started at 4 locally on the theory that a
  // route sweep is IO-bound, and that turned out to be wrong in a way that
  // wasted an hour: at 4 the suite intermittently reported 11-15 failures --
  // "rendered an empty body" on the slowest pages, page.goto throwing
  // ERR_NETWORK_IO_SUSPENDED, and 45s timeouts on redirect assertions. Every
  // one was contention between the workers, a single `next start` and one
  // Supabase project in eu-west-1, and every one reads exactly like a real
  // regression. At 2 the same commit passes 59/59 repeatedly.
  //
  // A sweep that cries wolf gets ignored, which costs more than the ~20s it
  // saves. If you raise this, raise it in CI first where the box is dedicated.
  workers: 2,
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
