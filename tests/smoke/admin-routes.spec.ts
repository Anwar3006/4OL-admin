import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Visit every admin route and assert it renders.
 *
 * This is the net under the restructure. It is cheap, it needs no fixtures,
 * and it catches exactly the class of regression a folder rename or a
 * provider change causes: a page that renders an error boundary, a blank
 * body, or throws in the console.
 *
 * The two lists are deliberately separate.
 */

/** In the sidebar (app/(dashboard)/_components/admin-shell/navigation.ts). */
const NAV_ROUTES = [
  "/dashboard",
  "/admins",
  "/ai",
  "/anatomy",
  "/bedtracker",
  "/chats",
  "/delete-account-request",
  "/devops",
  "/diseases",
  "/facilities",
  "/facilityscout",
  "/faq",
  "/fitness",
  "/hcp",
  "/healthy_living",
  "/ibp",
  "/jobs",
  "/map",
  "/marketing",
  "/medenquiry",
  "/medication-reminder",
  "/notifications",
  "/notifications/devices",
  "/period",
  "/reports",
  "/reviews",
  "/schematic",
  "/security",
  "/settings",
  "/symptoms",
  "/tasks",
  "/top-rated",
  "/transactions",
  "/users",
];

/**
 * Present in the tree but NOT in the sidebar.
 *
 * These are the E2 "retire the duplicates" candidates. They are checked in a
 * non-blocking way so this sweep becomes the EVIDENCE for that epic rather
 * than a guess: run it, read the annotations, and you know which of these
 * still render (keep or redirect) and which are already broken (delete).
 *
 * Absence from the sidebar is not proof a route is dead — `/unauthorized` is
 * a redirect target, and the `view-*` routes are reached from table rows.
 */
const ORPHAN_CANDIDATES = [
  "/ai-hub",
  "/categories",
  "/human-anatomy",
  "/medication-enquiry",
  "/new-fitness",
  "/onboarding-requests",
  "/platform-schematic",
  "/referrals",
  "/security-center",
  "/unauthorized",
  "/view-reviews",
];

/** Console noise that is not a page defect. */
const IGNORED_CONSOLE = [
  /favicon/i,
  /Download the React DevTools/i,
  /was preloaded using link preload/i,
  /Failed to load resource.*(analytics|posthog|sentry)/i,
];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (error) => errors.push(`uncaught: ${error.message}`));
  return errors;
}

async function assertRenders(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });

  expect(response?.status(), `${route} returned ${response?.status()}`).toBeLessThan(500);

  // Next.js error boundary, and the app's own.
  await expect(
    page.getByText(/Application error|something went wrong|Unhandled Runtime Error/i),
    `${route} rendered an error boundary`,
  ).toHaveCount(0);

  // A page that renders nothing is a failure even without an error.
  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, `${route} rendered an empty body`).toBeGreaterThan(20);
}

test.describe("admin routes render", () => {
  for (const route of NAV_ROUTES) {
    test(`${route}`, async ({ page }) => {
      const errors = collectErrors(page);
      await assertRenders(page, route);
      expect(errors, `${route} logged console errors:\n${errors.join("\n")}`).toEqual([]);
    });
  }
});

/**
 * This app answers a missing route with HTTP **200** and a rendered "Page not
 * found" body, not a 404.
 *
 * `app/[...not-found]/page.jsx` is a root catch-all that calls `notFound()`,
 * and every unmatched path falls into it. So `status >= 400` never fires and
 * a route that does not exist is indistinguishable from one that does — by
 * status code. It has to be recognised by what it renders.
 *
 * This matters more than it looks: it is the same silent-failure shape as the
 * other two traps in this codebase (see docs/cleanup-handoff.md). Nothing
 * errors; the wrong answer just looks like a real one.
 */
const SOFT_NOT_FOUND = /Page not found/i;

test.describe("orphan route candidates (informational)", () => {
  for (const route of ORPHAN_CANDIDATES) {
    test(`${route}`, async ({ page }) => {
      // `networkidle`, not `domcontentloaded`. Redirect stubs in this app
      // resolve client-side, so domcontentloaded samples the page BEFORE the
      // redirect lands and reports an empty body at the original URL — which
      // reads as "broken" when the route is in fact a working redirect.
      // /human-anatomy is exactly this case.
      const response = await page.goto(route, { waitUntil: "networkidle" });
      const status = response?.status() ?? 0;
      const finalUrl = new URL(page.url()).pathname;
      const redirected = finalUrl !== route;
      const bodyText = (await page.locator("body").innerText()).trim();
      const softNotFound = !redirected && SOFT_NOT_FOUND.test(bodyText);

      const verdict = redirected
        ? `redirects to ${finalUrl} (keep as a redirect, or delete with a redirect rule)`
        : status >= 400 || softNotFound
          ? `NOT A ROUTE — served by the [...not-found] catch-all (safe to delete)`
          : bodyText.length < 20
            ? `renders an empty body (already broken — safe to delete)`
            : `renders, ${bodyText.length} chars (LIVE, do not delete without checking who links here)`;

      test.info().annotations.push({
        type: "orphan-check",
        description: `${route} → ${verdict}`,
      });

      // Never fails. This test exists to produce the annotation above.
      expect(status).toBeGreaterThan(0);
    });
  }
});
