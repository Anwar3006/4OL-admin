import { test as setup, expect } from "@playwright/test";

/**
 * Signs in once and saves the session for the smoke sweep.
 *
 * This also exercises the thing the layout merge changed: DashboardWrapper's
 * auth gate. If sign-in stops landing on /dashboard, every smoke test fails
 * with a useful message rather than 50 confusing timeouts.
 */
const AUTH_FILE = "tests/smoke/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  setup.skip(
    !email || !password,
    "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set — skipping the smoke sweep.",
  );

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /sign in|log in|login/i }).click();

  await expect(
    page,
    "Sign-in did not reach the dashboard. The (dashboard) layout mounts the " +
      "auth gate via DashboardWrapper — check that layout.tsx still renders it.",
  ).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.context().storageState({ path: AUTH_FILE });
});
