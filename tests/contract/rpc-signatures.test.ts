import { createClient } from "@supabase/supabase-js";
import { describe, expect, test } from "vitest";

import snapshot from "./rpc-signatures.json";
import { CONTRACT_RPCS } from "./mobile-contract";

/**
 * The 48 Postgres functions the Expo app depends on, pinned to a snapshot of their
 * real signatures taken from production on 5 Sept 2026.
 *
 * It was 28 until the regeneration script could be run for the first time —
 * see the provenance note in mobile-contract.ts. The extra 14 are the device
 * sign-in, push-token and app-review families.
 *
 * Why this matters more than it looks: PostgREST resolves an RPC by argument
 * NAME. Renaming `p_limit` to `p_page_size`, reordering parameters, or
 * dropping one does not fail loudly — the old mobile build's call stops
 * matching any function and 404s, on phones you cannot update.
 *
 * Adding a parameter WITH A DEFAULT is safe, and will show up here as a diff;
 * update rpc-signatures.json in the same commit. Anything else is a breaking
 * change that needs a mobile release to ship first.
 *
 * Signatures are read through `contract_rpc_signatures()` — a narrow,
 * read-only pg_proc reader added by migration
 * 20260905_contract_rpc_signatures_reader.sql. Do NOT "simplify" this by
 * probing each RPC with a speculative call: several of them are volatile and
 * would write rows to production (join_fitness_challenge,
 * redeem_fitcoin_reward, log_manual_activity, the increment_* family).
 *
 * Skips when database credentials are absent, so a fresh clone and fork PRs
 * still run green. Set SUPABASE_SECRET_KEY in CI to enable it.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SERVICE_KEY;

const hasCredentials = Boolean(url && serviceKey);

type Signature = {
  args: string;
  returns: string;
  security_definer: boolean;
  volatility: string;
};

describe("mobile RPC list", () => {
  test("the snapshot covers exactly the contracted RPCs", () => {
    expect(Object.keys(snapshot).sort()).toEqual([...CONTRACT_RPCS].sort());
  });
});

describe.skipIf(!hasCredentials)("mobile RPC signatures", () => {
  test("every contracted RPC exists with an unchanged signature", async () => {
    const admin = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.rpc("contract_rpc_signatures", {
      p_names: [...CONTRACT_RPCS],
    });

    expect(
      error,
      "Could not read RPC signatures. Apply migration " +
        "20260905_contract_rpc_signatures_reader.sql, and make sure the key " +
        "in SUPABASE_SECRET_KEY is the service role key.",
    ).toBeNull();

    const live = (data ?? {}) as Record<string, Signature>;
    const expected = snapshot as unknown as Record<string, Signature>;

    const missing = CONTRACT_RPCS.filter((name) => !live[name]);
    expect(
      missing,
      `These RPCs no longer exist in the database and the mobile app calls ` +
        `them: ${missing.join(", ")}. Installed builds will 404.`,
    ).toEqual([]);

    for (const name of CONTRACT_RPCS) {
      expect(
        live[name],
        `RPC ${name} changed signature.\n` +
          `  was: ${JSON.stringify(expected[name])}\n` +
          `  now: ${JSON.stringify(live[name])}\n` +
          `If you ADDED a parameter with a default, update ` +
          `tests/contract/rpc-signatures.json in this commit. If you dropped, ` +
          `renamed or reordered one, this breaks installed mobile builds — ` +
          `ship a mobile release first.`,
      ).toEqual(expected[name]);
    }
  }, 30_000);
});
