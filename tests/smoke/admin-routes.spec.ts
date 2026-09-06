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
  "/bed-tracker",
  "/chats",
  "/delete-account-request",
  "/devops",
  "/diseases",
  "/facilities",
  "/facility-scout",
  "/faq",
  "/fitness",
  "/hcp",
  "/healthy-living",
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
  // `networkidle`, not `domcontentloaded`. These pages fetch their content
  // after hydration, so domcontentloaded samples an empty shell: the suite
  // reported "rendered an empty body" on a rotating handful of the slowest
  // routes — /security, /symptoms, /transactions, /facilities and others —
  // and passed on the next run with a different set. Three separate sessions
  // lost time to it before it was fixed here rather than retried around.
  //
  // A flaky assertion is worse than a missing one: it trains you to re-run
  // until green, which is exactly how a real regression gets waved through.
  const response = await page.goto(route, { waitUntil: "networkidle" });

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

/**
 * Routes with a known, pre-existing backend fault. Empty — and it should stay
 * that way.
 *
 * Four routes lived here briefly: /bedtracker, /facilityscout, /map and
 * /delete-account-request, all surfaced the moment the sweep moved from
 * `domcontentloaded` to `networkidle` (the old wait sampled the page before
 * their requests came back). All four are fixed; see the commit that emptied
 * this list.
 *
 * If you add an entry, give it a root cause, not just a route. The assertion
 * below fails when a quarantined route comes back clean, so the list cannot
 * rot into a permanent excuse.
 */
const KNOWN_BROKEN: Record<string, string> = {};

test.describe("admin routes render", () => {
  for (const route of NAV_ROUTES) {
    test(`${route}`, async ({ page }) => {
      const errors = collectErrors(page);
      await assertRenders(page, route);

      const known = KNOWN_BROKEN[route];
      if (known) {
        // Quarantined — but prove the quarantine is still earned. A route that
        // starts coming back clean should leave this list, not sit in it.
        expect(
          errors.length,
          `${route} is in KNOWN_BROKEN but logged no console errors — the ` +
            `underlying fault looks fixed. Remove it from the list.\n${known}`,
        ).toBeGreaterThan(0);
        test.info().annotations.push({ type: "known-broken", description: `${route} — ${known}` });
        return;
      }

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

/**
 * Routes that survived an epic that deleted their siblings, and that nothing
 * links to. These are the ones a future cleanup is most likely to take out by
 * accident, so unlike the informational block below, **these fail the build**.
 *
 * /ai-hub/period and /ai-hub/period/content are the case in point. The audit
 * described /ai-hub as "8 files incl. a 23 KB Workspace — substantial, check
 * first", which reads as one duplicate feature. Five of its seven routes were
 * redirect stubs to /ai and are now rules in next.config.ts. These two are
 * real, unique pages with their own API route (/api/ai-hub/period) and they
 * appear in no sidebar. `rm -rf app/(dashboard)/ai-hub` — the obvious next
 * move for anyone reading "duplicate of /ai" — silently removes them.
 *
 * The redirects that replaced their siblings are asserted here too. A
 * next.config.ts rule is easy to drop in a merge, and a lost redirect breaks
 * an admin's bookmark with no error anywhere.
 */
const MUST_SURVIVE = ["/ai-hub/period", "/ai-hub/period/content"];

const MUST_REDIRECT: Array<[string, string]> = [
  ["/human-anatomy", "/anatomy"],
  ["/platform-schematic", "/schematic"],
  ["/security-center", "/security"],
  ["/medication-enquiry", "/medenquiry"],
  ["/medication-enquiry/delivery", "/medenquiry?tab=delivery"],
  ["/medication-enquiry/escrow", "/medenquiry?tab=escrow"],
  ["/medication-enquiry/pending", "/medenquiry?tab=pending"],
  ["/ai-hub", "/ai"],
  ["/ai-hub/analytics", "/ai?tab=analytics"],
  ["/ai-hub/models", "/ai?tab=models"],
  ["/ai-hub/moderation", "/ai?tab=moderation"],
  ["/ai-hub/recommendations", "/ai?tab=recommendations"],

  // Hollow facility-type shells retired in E3.3. Each rendered an empty div
  // AND shadowed /facilities/[type], because a static segment beats a dynamic
  // one in Next. The slugs do not match facility_type, so the destinations map
  // each onto the real enum value and let /facilities?type= filter.
  //
  // next.config.ts writes hospital_%2F_clinic, because `hospital_/_clinic` is
  // a real facility_type containing a slash. The browser normalises %2F back
  // to a literal slash in the query string, so that is what lands here — and
  // both forms filter identically, verified against /api/facilities.
  ["/facilities/hospitals", "/facilities?type=hospital_/_clinic"],
  ["/facilities/dental", "/facilities?type=dental_clinic"],
  ["/facilities/pharmacies", "/facilities?type=pharmacy"],
  ["/facilities/eye-care", "/facilities?type=eye_clinic"],
  ["/facilities/homes", "/facilities?type=home"],
  ["/facilities/diagnostic-labs", "/facilities?type=diagnostic_lab"],
  ["/facilities/osteopathy", "/facilities?type=osteopathy_center"],
  ["/facilities/physiotherapy", "/facilities?type=physiotherapy_center"],
  ["/facilities/prosthetics", "/facilities?type=prosthetics_center"],
  ["/facilities/health-school", "/facilities?type=health_school"],
  ["/facilities/add-facility", "/facilities"],
  ["/facilities/hospitals/create", "/facilities?type=hospital_/_clinic"],
  ["/facilities/dental/create", "/facilities?type=dental_clinic"],
  ["/facilities/eye-care/create", "/facilities?type=eye_clinic"],
  ["/facilities/homes/create", "/facilities?type=home"],
  ["/facilities/diagnostic-labs/create", "/facilities?type=diagnostic_lab"],
  ["/facilities/featured", "/facilities?tab=featured"],
  ["/facilities/top-rated", "/facilities?tab=top-rated"],

  // Marketing sub-routes collapsed into the unified page (M-D6). These were
  // server-side redirect() stubs before E3.2 moved them into next.config.ts.
  ["/marketing/discounts", "/marketing?tab=discounts"],
  ["/marketing/subscriptions", "/marketing?tab=subscriptions"],

  // Kebab-case page routes (E3.3). The old spellings stay reachable for
  // bookmarks; every in-app link points at the new ones.
  ["/healthy_living", "/healthy-living"],
  ["/facilityscout", "/facility-scout"],
  ["/bedtracker", "/bed-tracker"],
];

test.describe("live but unlinked — must not be deleted", () => {
  for (const route of MUST_SURVIVE) {
    test(`${route} still renders`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      const body = (await page.locator("body").innerText()).trim();
      expect(
        SOFT_NOT_FOUND.test(body),
        `${route} is gone — it is served by the [...not-found] catch-all now`,
      ).toBe(false);
      expect(body.length, `${route} rendered an empty body`).toBeGreaterThan(20);
    });
  }
});

test("the un-shadowed /facilities/[type] route still renders", async ({ page }) => {
  // Ten hollow static pages used to shadow this dynamic route. Retiring them
  // is only correct if [type] itself still works — dental_clinic is a real
  // facility_type value, unlike the legacy slugs that shadowed it.
  await page.goto("/facilities/dental_clinic", { waitUntil: "networkidle" });
  const body = (await page.locator("body").innerText()).trim();
  expect(SOFT_NOT_FOUND.test(body), "/facilities/[type] is gone").toBe(false);
  expect(body.length, "/facilities/[type] rendered an empty body").toBeGreaterThan(20);
});

test.describe("retired routes still redirect", () => {
  for (const [from, to] of MUST_REDIRECT) {
    test(`${from} → ${to}`, async ({ page }) => {
      await page.goto(from, { waitUntil: "networkidle" });
      const url = new URL(page.url());
      expect(url.pathname + url.search, `${from} no longer redirects to ${to}`).toBe(to);
    });
  }
});

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
