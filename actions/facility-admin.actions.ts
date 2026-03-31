"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function adminRegisterFacilityWithProfile(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "register_facility_with_profile",
    payload
  );
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateFacilityProfile(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "admin_update_facility_profile",
    payload
  );
  if (error) throw new Error(error.message);
  return data;
}

export async function adminChangeFacilityStatus(payload: any) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc(
    "admin_change_facility_status",
    payload
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
  const { data, error } = await admin
    .from("facility_profile")
    .update({ is_top_rated: value })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return data;
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
