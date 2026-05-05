const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function run() {
  console.log("Trying user!user_profiles_user_id_fkey...");
  let res = await supabase.from("user_profiles").select("id, auth_user:user!user_profiles_user_id_fkey(id)").limit(1);
  console.log("Result for user:", res.error ? res.error.message : "Success");
  
  console.log("Trying user!inner...");
  res = await supabase.from("user_profiles").select("id, auth_user:user(id)").limit(1);
  console.log("Result for user:", res.error ? res.error.message : "Success");
}
run().catch(console.error);
