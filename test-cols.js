const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.rhbbxttxnvcziyqzptqs:4ourlife_4OL@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND table_schema = 'public';
  `);
  console.log(res.rows.map(r => r.column_name));
  await client.end();
}
run().catch(console.error);
