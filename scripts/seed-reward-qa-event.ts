/**
 * seed-reward-qa-event.ts — throwaway fixture for testing trivia reward
 * disbursement end-to-end: one draft-only trivia event, a full reward-tier
 * cascade (placement + stackable bonuses + an inventory-capped voucher), and
 * synthetic submissions engineered to exercise ties, a NULL duration, and
 * both cap mechanisms (max_winners and inventory_count).
 *
 * This is a script, not a migration: it is throwaway QA data, re-run on
 * demand, torn down when you're done — never applied to a real environment
 * as permanent state.
 *
 *   node loadtest/seed-reward-qa-users.mjs create 20   # run first
 *   npx tsx scripts/seed-reward-qa-event.ts create
 *   ... run close_period_trivia_event, verify, click through the admin UI ...
 *   npx tsx scripts/seed-reward-qa-event.ts destroy
 *   node loadtest/seed-reward-qa-users.mjs destroy
 *
 * Requires .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY) —
 * same as every other script in this directory.
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import * as fs from "fs";
import { getAdminClient } from "../lib/db/admin";

const USERS_FILE = path.join(process.cwd(), "loadtest", "reward-qa-users.json");
const SLUG_PREFIX = "qa-reward-test-";
const VOUCHER_SOURCE_KEY = "qa:reward_disbursement_voucher";

function mostRecentFriday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat, Friday=5
  const diff = (day - 5 + 7) % 7 || 7; // always strictly in the past
  const friday = new Date(now);
  friday.setUTCDate(now.getUTCDate() - diff);
  friday.setUTCHours(18, 0, 0, 0);
  return friday;
}

function fakeAnswers(score: number) {
  return Array.from({ length: 10 }, (_, i) => ({ position: i + 1, correct: i < score }));
}

async function create() {
  if (!fs.existsSync(USERS_FILE)) {
    console.error(`Missing ${USERS_FILE} — run "node loadtest/seed-reward-qa-users.mjs create 20" first.`);
    process.exit(1);
  }
  const users: Array<{ id: string; email: string }> = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  if (users.length < 8) {
    console.error(`Only ${users.length} reward-QA users on disk — need at least 8 for a meaningful test. Seed more first.`);
    process.exit(1);
  }

  const admin = getAdminClient();

  const { data: existing } = await admin.from("period_trivia_events").select("id,slug").ilike("slug", `${SLUG_PREFIX}%`).maybeSingle();
  if (existing) {
    console.error(`A QA event already exists (${existing.slug}, id ${existing.id}). Run "destroy" first.`);
    process.exit(1);
  }

  const { data: catalog, error: catalogError } = await admin
    .from("reward_catalog")
    .select("id,source_key")
    .in("source_key", ["seed:cash_500", "seed:cash_200", "seed:cash_100", "seed:cash_50", "seed:fitcoins_500"]);
  if (catalogError || !catalog || catalog.length < 5) {
    console.error("Seeded reward_catalog rows not found — apply 20260915100000_seed_reward_catalog.sql first.", catalogError?.message ?? "");
    process.exit(1);
  }
  const rewardBySourceKey = new Map(catalog.map((row) => [row.source_key, row.id]));

  // A QA-only voucher with deliberately tiny inventory, kept separate from
  // the permanent catalog seed so its exhaustion-test inventory_count=5
  // never has to be a "real" reward's number. Upserted on source_key so
  // re-running create after a partial failure doesn't duplicate it.
  const { data: voucher, error: voucherError } = await admin
    .from("reward_catalog")
    .upsert(
      {
        name: "QA Participation Voucher", description: "Throwaway fixture for testing inventory exhaustion — safe to ignore in real reporting.",
        icon: "🧪", reward_type: "discount", domains: ["general", "trivia"], fulfillment_method: "code",
        inventory_count: 5, source_key: VOUCHER_SOURCE_KEY, is_active: true,
      },
      { onConflict: "source_key" },
    )
    .select("id")
    .single();
  if (voucherError || !voucher) {
    console.error("Unable to create the QA voucher reward.", voucherError?.message);
    process.exit(1);
  }

  const startsAt = mostRecentFriday();
  const endsAt = new Date(startsAt.getTime() + 60 * 60000);
  const stamp = Date.now().toString(36);
  const { data: event, error: eventError } = await admin
    .from("period_trivia_events")
    .insert({
      title: "QA — Reward Disbursement Test (DO NOT PUBLISH)",
      slug: `${SLUG_PREFIX}${stamp}`,
      status: "draft", // draft is permanently invisible to GET /api/period/trivia — this is what actually keeps it from real players, not the title.
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      timezone: "Africa/Accra",
      question_count: 10,
      leaderboard_publish_at: endsAt.toISOString(),
      created_by: users[0].id,
    })
    .select("id,slug")
    .single();
  if (eventError || !event) {
    console.error("Unable to create the QA trivia event.", eventError?.message);
    process.exit(1);
  }
  console.log(`Created QA event ${event.slug} (${event.id})`);

  const tiers = [
    { tier_order: 1, tier_label: "1st place", criteria_type: "top_n_ranked", criteria_params: { n: 1 }, reward_id: rewardBySourceKey.get("seed:cash_500"), stackable: false },
    { tier_order: 2, tier_label: "2nd place", criteria_type: "rank_range", criteria_params: { from: 2, to: 2 }, reward_id: rewardBySourceKey.get("seed:cash_200"), stackable: false },
    { tier_order: 3, tier_label: "3rd place", criteria_type: "rank_range", criteria_params: { from: 3, to: 3 }, reward_id: rewardBySourceKey.get("seed:cash_100"), stackable: false },
    { tier_order: 4, tier_label: "4th-10th place", criteria_type: "rank_range", criteria_params: { from: 4, to: 10 }, reward_id: rewardBySourceKey.get("seed:cash_50"), stackable: false },
    { tier_order: 5, tier_label: "Perfect score bonus", criteria_type: "perfect_score", criteria_params: {}, reward_id: rewardBySourceKey.get("seed:fitcoins_500"), stackable: true, max_winners: 5 },
    { tier_order: 6, tier_label: "Thanks for playing", criteria_type: "all_participants", criteria_params: {}, reward_id: voucher.id, stackable: true },
  ].map((tier) => ({ ...tier, source_domain: "trivia", source_id: event.id, created_by: users[0].id }));

  const { error: tiersError } = await admin.from("reward_tiers").insert(tiers);
  if (tiersError) {
    console.error("Unable to create reward tiers.", tiersError.message);
    process.exit(1);
  }
  console.log(`Created ${tiers.length} reward tiers.`);

  // 7 perfect scores: a fastest-to-slowest ladder, one exact (score,duration)
  // tie broken only by submitted_at, and one NULL duration (must sort last,
  // never first, among an otherwise-identical score group).
  const perfect = [
    { score: 10, duration_seconds: 60 },
    { score: 10, duration_seconds: 65 },
    { score: 10, duration_seconds: 70 }, // tie A — submitted earlier, must outrank tie B
    { score: 10, duration_seconds: 70 }, // tie B
    { score: 10, duration_seconds: 75 },
    { score: 10, duration_seconds: 80 },
    { score: 10, duration_seconds: null }, // must rank LAST among perfect scores, not first
  ];
  // 11 non-perfect scores filling ranks 8+, so rank_range{4,10} pulls from
  // both groups and all_participants has enough entries to exhaust a
  // 5-unit voucher inventory across 18 total participants.
  const imperfect = [
    { score: 9, duration_seconds: 50 }, { score: 9, duration_seconds: 55 },
    { score: 8, duration_seconds: 65 }, { score: 8, duration_seconds: 90 },
    { score: 7, duration_seconds: 70 }, { score: 7, duration_seconds: 100 },
    { score: 6, duration_seconds: 80 }, { score: 5, duration_seconds: 60 },
    { score: 5, duration_seconds: 90 }, { score: 4, duration_seconds: 75 },
    { score: 3, duration_seconds: 85 },
  ];
  const plan = [...perfect, ...imperfect];
  if (users.length < plan.length) {
    console.error(`Need at least ${plan.length} reward-QA users, only ${users.length} available.`);
    process.exit(1);
  }

  const submittedBase = startsAt.getTime() + 5 * 60000;
  const rows = plan.map((entry, i) => ({
    event_id: event.id,
    user_id: users[i].id,
    device_hash: `qa-device-${event.id}-${i}`,
    mobile_hash: `qa-mobile-${event.id}-${i}`,
    score: entry.score,
    question_count: 10,
    answers: fakeAnswers(entry.score),
    duration_seconds: entry.duration_seconds,
    // Direct inserts bypass submit_period_trivia entirely (deliberately —
    // this fixture needs exact control over timestamps and a NULL duration
    // the real RPC can no longer produce), so submitted_at is set by hand,
    // strictly increasing so the tie pair's earlier row really is earlier.
    submitted_at: new Date(submittedBase + i * 60000).toISOString(),
  }));

  const { error: submissionsError } = await admin.from("period_trivia_submissions").insert(rows);
  if (submissionsError) {
    console.error("Unable to insert synthetic submissions.", submissionsError.message);
    process.exit(1);
  }
  console.log(`Inserted ${rows.length} synthetic submissions (${perfect.length} perfect, ${imperfect.length} imperfect).`);

  console.log("\nNext steps:");
  console.log(`  select * from period_trivia_ranked_submissions where event_id = '${event.id}' order by rnk;`);
  console.log(`  select close_period_trivia_event('${event.id}', '${users[0].id}');`);
  console.log(`  -- run it a second time and confirm it returns {"already_closed": true} with no new rows`);
}

async function destroy() {
  const admin = getAdminClient();
  const { data: event, error } = await admin.from("period_trivia_events").select("id,slug").ilike("slug", `${SLUG_PREFIX}%`).maybeSingle();
  if (error) {
    console.error("Unable to look up the QA event.", error.message);
    process.exit(1);
  }
  if (!event) {
    console.log("No QA event found — nothing to delete here (the voucher reward and QA users may still need cleanup separately).");
  } else {
    console.log(`Tearing down QA event ${event.slug} (${event.id})...`);
    // FK-safe order: leads and fulfillment reference submissions/events with
    // ON DELETE RESTRICT in places, so children go first.
    await admin.from("reward_grants").delete().eq("source_domain", "trivia").eq("source_type", "trivia_event").eq("source_id", event.id);
    await admin.from("period_trivia_fulfillment").delete().eq("event_id", event.id);
    await admin.from("period_trivia_leads").delete().eq("event_id", event.id);
    await admin.from("period_trivia_submissions").delete().eq("event_id", event.id);
    await admin.from("reward_tiers").delete().eq("source_domain", "trivia").eq("source_id", event.id);
    const { error: deleteEventError } = await admin.from("period_trivia_events").delete().eq("id", event.id);
    if (deleteEventError) {
      console.error("Unable to delete the QA event row.", deleteEventError.message);
      process.exit(1);
    }
    console.log("QA event and its rows removed.");
  }

  const { error: voucherError } = await admin.from("reward_catalog").delete().eq("source_key", VOUCHER_SOURCE_KEY);
  if (voucherError) console.error("Unable to delete the QA voucher reward.", voucherError.message);
  else console.log("QA voucher reward removed.");

  console.log("\nLast step: node loadtest/seed-reward-qa-users.mjs destroy");
}

const [, , cmd] = process.argv;
if (cmd === "create") await create();
else if (cmd === "destroy") await destroy();
else {
  console.log("usage: npx tsx scripts/seed-reward-qa-event.ts create | destroy");
  process.exit(1);
}
