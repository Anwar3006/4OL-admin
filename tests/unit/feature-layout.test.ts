import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * E3.2's finish line, kept from un-finishing.
 *
 * `hooks/supabase-calls/` held 42 TanStack Query hooks that every feature
 * reached into. Emptying it was the definition of done for E3.2, so this
 * asserts it stays empty — a new hook belongs in
 * `features/<name>/data/`, next to the UI and routes that use it.
 */
const repoRoot = resolve(__dirname, "../..");

describe("feature layout (E3.2)", () => {
  test("hooks/supabase-calls/ stays gone", () => {
    const dir = resolve(repoRoot, "hooks/supabase-calls");
    const contents = existsSync(dir) ? readdirSync(dir) : [];
    expect(
      contents,
      "hooks/supabase-calls/ is back. That directory was the shared-hook dumping " +
        "ground E3.2 removed: put the hook in features/<name>/data/ instead, " +
        "beside the ui/ and api/ that use it.",
    ).toEqual([]);
  });

  test("every feature directory has the four-slot layout", () => {
    const features = readdirSync(resolve(repoRoot, "features"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    expect(features.length, "features/ is empty").toBeGreaterThan(15);

    for (const name of features) {
      const readme = resolve(repoRoot, "features", name, "README.md");
      expect(
        existsSync(readme),
        `features/${name} has no README.md. Rule 4 asks each feature to say ` +
          `what it owns, which tables and RPCs it touches, and whether mobile ` +
          `depends on it.`,
      ).toBe(true);
    }
  });
});
