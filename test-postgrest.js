const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
);

async function run() {
  console.log("Trying user_id...");
  let res = await supabase.from("user_profiles").select("id, auth_user:user_id(id)").limit(1);
  console.log("Result for user_id:", res.error ? res.error.message : "Success");

  console.log("Trying users!user_profiles_user_id_auth_fkey...");
  res = await supabase.from("user_profiles").select("id, auth_user:users!user_profiles_user_id_auth_fkey(id)").limit(1);
  console.log("Result for users!user_profiles_user_id_auth_fkey:", res.error ? res.error.message : "Success");

  console.log("Trying users!user_id...");
  res = await supabase.from("user_profiles").select("id, auth_user:users!user_id(id)").limit(1);
  console.log("Result for users!user_id:", res.error ? res.error.message : "Success");
}
run().catch(console.error);
