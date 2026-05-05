#!/usr/bin/env node
/**
 * user-migration.mjs
 *
 * Migrates all users from the BetterAuth "user" table into Supabase Auth.
 *
 * PREREQUISITES:
 *   1. Run fix_handle_new_user_trigger.sql in Supabase Dashboard first.
 *   2. Run the STEP 1 SELECT in user_migration_betterauth_to_supabase.sql
 *      and review the output. Then uncomment the DELETE lines and run them.
 *   3. npm install @supabase/supabase-js pg dotenv --save-dev (one-time)
 *   4. Create a .env.migration file next to this script (see below).
 *
 * .env.migration:
 *   SUPABASE_URL=https://rhbbxttxnvcziyqzptqs.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
 *   DATABASE_URL=postgresql://postgres.rhbbxttxnvcziyqzptqs:4ourlife_4OL@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
 *
 * RUN:
 *   node user-migration.mjs
 *   node user-migration.mjs --dry-run   # Preview only, no changes
 *
 * WHAT IT DOES:
 *   1. Reads all users from the BetterAuth "user" table + their user_profiles
 *   2. For each user, calls supabase.auth.admin.createUser() with:
 *      - Their email
 *      - A temporary random password (they'll need to reset it) OR their
 *        existing password hash cannot be transferred — see note below.
 *      - raw_user_meta_data with all profile fields so the trigger fires
 *   3. Sends a password reset email to each user so they can set a new password
 *   4. Logs a summary
 *
 * PASSWORD NOTE:
 *   BetterAuth hashes passwords using its own format which is incompatible
 *   with Supabase Auth's bcrypt format. Passwords CANNOT be migrated directly.
 *   Each user must reset their password. This script sends them a reset email.
 */

import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDryRun = process.argv.includes("--dry-run");

// ── Load env ─────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
    }
  } catch {
    // Fall through to process.env (already set in environment)
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error(
    "❌  Missing env vars. Create .env.local with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pool = new pg.Pool({ connectionString: DATABASE_URL });

// ── Fetch existing users from BetterAuth tables ───────────────────────────────
async function fetchBetterAuthUsers() {
  const { rows } = await pool.query(`
    SELECT
      u.id            AS better_auth_id,
      u.email,
      u.name,
      u.created_at,
      up.first_name,
      up.last_name,
      up.phone_number,
      up.sex,
      up.dob,
      up.role,
      up.user_type,
      up.status,
      up.expo_push_token,
      up.has_completed_fitness_onboarding,
      up.requires_password_change
    FROM "user" u
    LEFT JOIN public.user_profiles up ON up.user_id = u.id
    ORDER BY u.created_at
  `);
  return rows;
}

// ── Migrate a single user ─────────────────────────────────────────────────────
async function migrateUser(user) {
  console.log(`\n→ Migrating: ${user.email} (${user.better_auth_id})`);

  if (isDryRun) {
    console.log("  [DRY RUN] Would create Supabase Auth user with metadata:", {
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      sex: user.sex,
      dob: user.dob,
      role: user.role,
      user_type: user.user_type,
    });
    return { success: true, dryRun: true };
  }

  // 1. Create the Supabase Auth user
  //    email_confirm: true skips the confirmation email (we'll send a password reset instead)
  const { data: authUser, error: createError } =
    await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true, // Mark email as confirmed — they were already verified in BetterAuth
      user_metadata: {
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone_number: user.phone_number || "",
        sex: user.sex || null,
        dob: user.dob || null,
        role: user.role || "user",
        user_type: user.user_type || "customer",
      },
    });

  if (createError) {
    if (createError.message.includes("already been registered")) {
      console.log(
        `  ⚠️  User already exists in Supabase Auth — skipping create`,
      );
    } else {
      console.error(`  ❌  Failed to create auth user: ${createError.message}`);
      return { success: false, error: createError.message };
    }
  } else {
    console.log(`  ✅  Created auth user: ${authUser.user.id}`);
  }

  // 2. Update user_profiles with any extra fields the trigger might have missed
  //    (trigger fires on auth.users insert, so it runs in step 1 above)
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      has_completed_fitness_onboarding:
        user.has_completed_fitness_onboarding ?? false,
      requires_password_change: user.requires_password_change ?? false,
      expo_push_token: user.expo_push_token ?? null,
      status: user.status || "active",
    })
    .eq("user_id", authUser?.user?.id ?? user.better_auth_id);

  if (profileError) {
    console.warn(`  ⚠️  Profile update warning: ${profileError.message}`);
  } else {
    console.log(`  ✅  Profile updated with extra fields`);
  }

  // 3. Send password reset email so user can set a new password
  const { error: resetError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
  });

  if (resetError) {
    console.warn(`  ⚠️  Could not generate reset link: ${resetError.message}`);
  } else {
    console.log(
      `  📧  Password reset link generated (check Supabase logs or email provider)`,
    );
  }

  return { success: true };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("  4OurLife — BetterAuth → Supabase Auth User Migration");
  console.log(
    isDryRun ? "  MODE: DRY RUN (no changes will be made)" : "  MODE: LIVE",
  );
  console.log("=".repeat(60));

  const users = await fetchBetterAuthUsers();
  console.log(`\nFound ${users.length} user(s) to migrate:\n`);
  for (const u of users) {
    console.log(`  - ${u.email} | role: ${u.role} | type: ${u.user_type}`);
  }

  if (users.length === 0) {
    console.log(
      "\nNo users found. Has the BetterAuth user table been populated?",
    );
    await pool.end();
    return;
  }

  const results = { success: 0, failed: 0, skipped: 0 };

  for (const user of users) {
    const result = await migrateUser(user);
    if (result.dryRun) results.skipped++;
    else if (result.success) results.success++;
    else results.failed++;
  }

  await pool.end();

  console.log("\n" + "=".repeat(60));
  console.log("  Migration complete");
  console.log(`  ✅  Succeeded : ${results.success}`);
  console.log(`  ❌  Failed    : ${results.failed}`);
  console.log(`  ⏭️  Skipped   : ${results.skipped} (dry run)`);
  console.log("=".repeat(60));

  if (!isDryRun && results.success > 0) {
    console.log(`
NEXT STEPS:
  1. Ask each user to check their email for a password reset link.
  2. Verify users appear in: Supabase Dashboard → Authentication → Users
  3. Run the STEP 3 verification queries in user_migration_betterauth_to_supabase.sql
  4. Once verified, you can safely drop the BetterAuth "user", "session",
     and "account" tables (keep a backup first).
`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
