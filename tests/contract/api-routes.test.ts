import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  CONTRACT_ROUTES,
  DEPRECATED_ROUTES,
} from "./mobile-contract";

/**
 * The mobile contract, enforced structurally.
 *
 * This does not start a server or hit the database. It asserts the thing that
 * actually breaks during a restructure: that every route the Expo app calls
 * still exists at the path it calls, and still exports the HTTP verbs it uses.
 *
 * Renaming a folder, converting route.js → route.ts without moving it, or
 * dropping a handler all fail here, naming the mobile file that breaks.
 *
 * What this deliberately does NOT check is response *shape*. That needs a
 * running server and a signed-in test user; see docs/mobile-contract.md for
 * the upgrade path. Structure first — it is where the cheap regressions are.
 */

const repoRoot = resolve(__dirname, "../..");

const VERB = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS";
const HTTP_VERB = new RegExp(`export\\s+(?:async\\s+)?function\\s+(${VERB})\\b`, "g");

/**
 * `export { GET, POST } from "@/features/period/api/me";`
 *
 * Under E3.2 a route file is a re-export and the handler lives in
 * `features/<name>/api/`. Reading only the route file would find no
 * `export function GET` and report the route as gutted — a false alarm of
 * exactly the shape this suite exists to avoid producing.
 *
 * So the specifier is followed and the verbs are read from the module that
 * actually defines them. That is strictly stronger than matching the names in
 * the re-export line: it fails if the handler module is missing, or if it
 * stopped exporting the verb the re-export names.
 */
const RE_EXPORT = new RegExp(
  `export\\s*\\{([^}]*)\\}\\s*from\\s*["']([^"']+)["']`,
  "g",
);

function resolveSpecifier(specifier: string, fromFile: string): string | null {
  const base = specifier.startsWith("@/")
    ? resolve(repoRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(resolve(repoRoot, fromFile)), specifier)
      : null;
  if (!base) return null; // a bare package specifier cannot hold a route handler
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function exportedVerbs(relativePath: string, seen = new Set<string>()): string[] {
  const absolute = resolve(repoRoot, relativePath);
  if (seen.has(absolute)) return []; // cycle guard
  seen.add(absolute);

  const source = readFileSync(absolute, "utf8");
  const verbs = new Set([...source.matchAll(HTTP_VERB)].map((match) => match[1]));

  for (const [, clause, specifier] of source.matchAll(RE_EXPORT)) {
    const named = clause
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
      .filter((name) => new RegExp(`^(?:${VERB})$`).test(name));
    if (named.length === 0) continue;

    const target = resolveSpecifier(specifier, relativePath);
    if (!target) continue;
    const defined = exportedVerbs(relative(repoRoot, target), seen);
    for (const name of named) {
      // Only credit a verb the target module really defines.
      if (defined.includes(name)) verbs.add(name);
    }
  }
  return [...verbs].sort();
}

describe("mobile API contract", () => {
  test.each(CONTRACT_ROUTES)(
    "$path is served by a file that still exists",
    ({ path, file, consumer }) => {
      const absolute = resolve(repoRoot, file);
      expect(
        existsSync(absolute),
        `${path} is gone. The mobile app calls it from ${consumer}; ` +
          `removing or moving ${file} ships a broken app to every ` +
          `installed build. Add a redirect or restore the route.`,
      ).toBe(true);
    },
  );

  test.each(CONTRACT_ROUTES)(
    "$path still exports $methods",
    ({ path, file, methods, consumer }) => {
      const actual = exportedVerbs(file);
      for (const method of methods) {
        expect(
          actual,
          `${path} no longer exports ${method}. ${consumer} calls it. ` +
            `Exported verbs are now: ${actual.join(", ") || "(none)"}.`,
        ).toContain(method);
      }
    },
  );

  test.each(DEPRECATED_ROUTES)(
    "$path stays deprecated and is not quietly revived",
    ({ file }) => {
      const source = readFileSync(resolve(repoRoot, file), "utf8");
      expect(
        source,
        "This endpoint used to run unauthenticated select-* scans over " +
          "facility_profile and leak PII. It must keep returning 410.",
      ).toContain("410");
    },
  );

  test("the contract list has not silently shrunk", () => {
    // A guard against someone "tidying" an entry out of mobile-contract.ts.
    // If the mobile app genuinely stops using a route, delete it here AND
    // note it in docs/mobile-contract.md in the same commit.
    //
    // 16 -> 31 on 5 Sept 2026. That was not a change in what mobile uses; it
    // was the list finally catching up with it. The regeneration script had
    // never been runnable (it tested for ripgrep with `command -v rg`, which
    // succeeds when a shell defines `rg` as a function and then fails inside
    // the script's own subshell), so nobody had ever diffed this file against
    // the Expo repo. Fifteen live dependencies were unprotected: the whole
    // chat surface, all four Period Tracker routes, three attachment
    // endpoints, the OTP pair and redeem-promo.
    //
    // Before changing this number, run:
    //   bash scripts/cleanup/regenerate-mobile-contract.sh ../4-Our-Life-App
    expect(CONTRACT_ROUTES).toHaveLength(31);
  });
});
