/**
 * seed-reward-qa-users.mjs — create disposable users for the trivia reward
 * disbursement QA fixture, and delete them again. Mirrors seed-users.mjs's
 * pattern exactly, on its own reserved domain so `destroy` here can never
 * collide with a real (or in-progress) load-test sweep on loadtest-users.json.
 *
 *   node seed-reward-qa-users.mjs create 20   # creates 20 users, writes reward-qa-users.json
 *   node seed-reward-qa-users.mjs destroy     # deletes every user created by this script
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY (the secret key, NOT the
 * publishable one). Do not commit the service key.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DOMAIN = 'rewardqa.4ourlife.invalid'; // .invalid is reserved by RFC 2606
const PASSWORD = process.env.REWARD_QA_PASSWORD || 'RewardQA!2026#4OL';
const OUT = './reward-qa-users.json';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [, , cmd, countArg] = process.argv;

async function create(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const email = `rq-${String(i).padStart(4, '0')}@${DOMAIN}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { reward_qa: true, first_name: 'RewardQA', last_name: `User${i}` },
    });

    if (error) {
      if (/already been registered|already exists/i.test(error.message)) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = list?.users?.find((u) => u.email === email);
        if (found) {
          users.push({ id: found.id, email, password: PASSWORD });
          process.stdout.write('.');
          continue;
        }
      }
      console.error(`\nfailed to create ${email}: ${error.message}`);
      continue;
    }

    users.push({ id: data.user.id, email, password: PASSWORD });
    process.stdout.write('+');
  }

  writeFileSync(OUT, JSON.stringify(users, null, 2));
  console.log(`\n\n${users.length} users ready. Written to ${OUT}`);
  console.log('Next: node scripts/seed-reward-qa-event.ts create');
  console.log('When done: node scripts/seed-reward-qa-event.ts destroy   then   node loadtest/seed-reward-qa-users.mjs destroy');
}

async function destroy() {
  let known = [];
  if (existsSync(OUT)) known = JSON.parse(readFileSync(OUT, 'utf8'));

  const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) {
    console.error(`could not list users: ${error.message}`);
    process.exit(1);
  }

  const byDomain = (list?.users || []).filter((u) => u.email?.endsWith(`@${DOMAIN}`));
  const ids = new Set([...known.map((u) => u.id), ...byDomain.map((u) => u.id)].filter(Boolean));

  if (ids.size === 0) {
    console.log('Nothing to delete.');
    return;
  }

  let deleted = 0;
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    if (delErr) console.error(`\nfailed to delete ${id}: ${delErr.message}`);
    else { deleted++; process.stdout.write('-'); }
  }
  console.log(`\n\n${deleted} reward-QA users deleted.`);
  console.log('Run scripts/seed-reward-qa-event.ts destroy FIRST if you haven\'t — deleting these users cascades their reward_grants/period_trivia_attempts rows, but leaves period_trivia_submissions (ON DELETE SET NULL) and period_trivia_fulfillment orphaned.');
}

if (cmd === 'create') {
  const n = parseInt(countArg || '20', 10);
  console.log(`Creating ${n} reward-QA users on @${DOMAIN} ...`);
  await create(n);
} else if (cmd === 'destroy') {
  console.log('Deleting reward-QA users ...');
  await destroy();
} else {
  console.log('usage: node seed-reward-qa-users.mjs create <count> | destroy');
  process.exit(1);
}
