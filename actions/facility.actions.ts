"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Add a new facility profile.
 */
export async function addFacility(facilityData: any) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  try {
    const admin = getSupabaseAdmin();

    // Add auditing fields
    const dataToInsert = {
      ...facilityData,
      created_by: user.id,
      updated_by: user.id,
      is_created_by_admin_panel: false,
      status: "Pending",
      avg_rating: 0
    };

    const { error } = await admin
      .from("facility_profile")
      .insert([dataToInsert]);

    if (error) {
      console.error("[addFacility] Supabase error:", error.message);
      return { error: error.message };
    }

    return { error: null };
  } catch (err: any) {
    console.error("[addFacility] Unexpected error:", err.message);
    return { error: err.message };
  }
}
