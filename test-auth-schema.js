const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY,
  { db: { schema: 'auth' } }
);

async function run() {
  const { data, error } = await supabase.from('users').select('id, email').limit(2);
  console.log("Error:", error);
  console.log("Data:", data);
}
run().catch(console.error);
