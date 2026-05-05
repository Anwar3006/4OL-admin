const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function run() {
  const authRes = await supabase.auth.admin.listUsers();
  console.log("Users:", authRes.data?.users?.length);
  if (authRes.error) console.log("Error:", authRes.error);
}
run().catch(console.error);
