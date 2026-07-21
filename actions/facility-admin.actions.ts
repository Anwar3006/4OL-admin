"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function adminRegisterFacilityWithProfile(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "register_facility_with_profile",
    payload,
  );
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateFacilityProfile(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "admin_update_facility_profile",
    payload,
  );
  if (error) throw new Error(error.message);
  return data;
}

export async function adminChangeFacilityStatus(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "admin_change_facility_status",
    payload,
  );
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteFacilityAction(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("admin_delete_facility", payload);
  if (error) throw new Error(error.message);
  return data;
}

export async function adminToggleFacilityFeatured(id: string, value: boolean) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("facility_profile")
    .update({ is_featured: value })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return data;
}

export async function adminToggleFacilityTopRated(id: string, value: boolean) {
  const admin = getSupabaseAdmin();

  // Get facility data for denormalized fields
  const { data: facility, error: fetchError } = await admin
    .from("facility_profile")
    .select(
      "facility_name, area, featured_image_url, rating_average, rating_count",
    )
    .eq("id", id)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  // Update the legacy column (for backward compatibility during transition)
  const { error: updateError } = await admin
    .from("facility_profile")
    .update({ is_top_rated: value })
    .eq("id", id);

  if (updateError) throw new Error(updateError.message);

  // Sync to top_rated_items table
  if (value) {
    // Add to top_rated_items
    const { error: upsertError } = await admin.from("top_rated_items").upsert({
      module: "facility",
      item_id: id,
      title: facility.facility_name,
      subtitle: facility.area,
      image_url: facility.featured_image_url,
      rating: facility.rating_average,
      rating_count: facility.rating_count,
      source: "manual",
    });

    if (upsertError) throw new Error(upsertError.message);
  } else {
    // Remove from top_rated_items (only if manual source)
    const { error: deleteError } = await admin
      .from("top_rated_items")
      .delete()
      .eq("module", "facility")
      .eq("item_id", id)
      .eq("source", "manual");

    if (deleteError) throw new Error(deleteError.message);
  }

  return { success: true };
}

export async function adminDeleteFacilityOfferings(facilityId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("facility_offerings")
    .delete()
    .eq("facility_id", facilityId);
  if (error) throw new Error(error.message);
}

export async function adminInsertFacilityOfferings(offerings: any[]) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("facility_offerings").insert(offerings);
  if (error) throw new Error(error.message);
}
