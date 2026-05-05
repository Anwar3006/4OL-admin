const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.rhbbxttxnvcziyqzptqs:4ourlife_4OL@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT
      conname AS constraint_name,
      conrelid::regclass AS table_name,
      a.attname AS column_name,
      confrelid::regclass AS foreign_table_name,
      af.attname AS foreign_column_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
    WHERE confrelid = 'auth.users'::regclass AND conrelid = 'public.user_profiles'::regclass;
  `);
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
