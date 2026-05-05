const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.rhbbxttxnvcziyqzptqs:4ourlife_4OL@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    DELETE FROM auth.users WHERE email = 'prime@neizerholdings.com';
  `);
  console.log("Deleted rows:", res.rowCount);
  await client.end();
}
run().catch(console.error);
