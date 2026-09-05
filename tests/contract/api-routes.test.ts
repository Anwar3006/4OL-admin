import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const HTTP_VERB = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

function exportedVerbs(relativePath: string): string[] {
  const source = readFileSync(resolve(repoRoot, relativePath), "utf8");
  return [...source.matchAll(HTTP_VERB)].map((match) => match[1]).sort();
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
    expect(CONTRACT_ROUTES).toHaveLength(16);
  });
});
