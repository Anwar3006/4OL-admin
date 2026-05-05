const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function run() {
  const { data, error } = await supabase.from('user_profiles').select('user_id').limit(1);
  if (data && data.length > 0) {
    const userId = data[0].user_id;
    const authRes = await supabase.auth.admin.getUserById(userId);
    console.log("Email:", authRes.data?.user?.email);
  }
}
run().catch(console.error);
