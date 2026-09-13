/**
 * seed-users.mjs — create disposable load-test users, and delete them again.
 *
 *   node seed-users.mjs create 50     # creates 50 users, writes loadtest-users.json
 *   node seed-users.mjs destroy       # deletes every user created by this script
 *
 * Users are created with a reserved email domain so `destroy` can find them
 * again without guessing, and so a human scanning auth.users can tell at a
 * glance that these are not real people.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY (the secret key, NOT the
 * publishable one). Do not commit the service key.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DOMAIN = 'loadtest.4ourlife.invalid'; // .invalid is reserved by RFC 2606
const PASSWORD = process.env.LOADTEST_PASSWORD || 'LoadTest!2026#4OL';
const OUT = './loadtest-users.json';

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
    const email = `lt-${String(i).padStart(4, '0')}@${DOMAIN}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { load_test: true, first_name: 'Load', last_name: `Test${i}` },
    });

    if (error) {
      // Already exists from a previous run — look it up rather than failing.
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
  console.log('Remember: node seed-users.mjs destroy   when you are done.');
}

async function destroy() {
  let known = [];
  if (existsSync(OUT)) known = JSON.parse(readFileSync(OUT, 'utf8'));

  // Belt and braces: also sweep auth.users for anything on the reserved domain,
  // in case loadtest-users.json was lost or a previous run was interrupted.
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
  console.log(`\n\n${deleted} load-test users deleted.`);
  console.log('Check for orphaned rows: select * from user_profiles where user_id not in (select id from auth.users);');
}

if (cmd === 'create') {
  const n = parseInt(countArg || '50', 10);
  console.log(`Creating ${n} load-test users on @${DOMAIN} ...`);
  await create(n);
} else if (cmd === 'destroy') {
  console.log('Deleting load-test users ...');
  await destroy();
} else {
  console.log('usage: node seed-users.mjs create <count> | destroy');
  process.exit(1);
}
