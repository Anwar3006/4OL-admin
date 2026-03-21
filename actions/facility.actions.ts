"use server";

import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { headers } from "next/headers";

/**
 * Add a new facility profile.
 */
export async function addFacility(facilityData: any) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const admin = getSupabaseAdmin();
    
    // Add auditing fields
    const dataToInsert = {
      ...facilityData,
      created_by: session.user.id,
      updated_by: session.user.id,
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
