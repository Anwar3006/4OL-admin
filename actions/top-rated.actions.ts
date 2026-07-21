"use server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TTopRatedItemInput } from "@/schemas/top-rated.schema";

// Manual add/update top-rated item
export async function adminUpsertTopRatedItem(
  data: TTopRatedItemInput & { admin_id: string },
) {
  const admin = getSupabaseAdmin();

  // Get the source item's data based on module type
  const sourceData = await getSourceItemData(data.module, data.item_id);

  const { data: result, error } = await admin
    .from("top_rated_items")
    .upsert({
      module: data.module,
      item_id: data.item_id,
      title: sourceData.title,
      subtitle: sourceData.subtitle,
      image_url: sourceData.image_url,
      rating: sourceData.rating,
      rating_count: sourceData.rating_count,
      source: data.source || "manual",
      rank: data.rank,
      added_by: data.added_by || data.admin_id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result;
}

// Remove top-rated item
export async function adminRemoveTopRatedItem(module: string, item_id: string) {
  const admin = getSupabaseAdmin();

  // Check if the item is subscription-sourced
  const { data: existing, error: checkError } = await admin
    .from("top_rated_items")
    .select("source")
    .eq("module", module)
    .eq("item_id", item_id)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    throw new Error(checkError.message);
  }

  // Block manual removal of subscription-sourced items
  if (existing?.source === "subscription") {
    throw new Error(
      "Cannot manually remove subscription-sourced top-rated item. Cancel the facility subscription instead.",
    );
  }

  const { error } = await admin
    .from("top_rated_items")
    .delete()
    .eq("module", module)
    .eq("item_id", item_id);

  if (error) throw new Error(error.message);
}

// Get source item data for denormalized fields
async function getSourceItemData(module: string, item_id: string) {
  const admin = getSupabaseAdmin();

  switch (module) {
    case "facility": {
      const { data, error } = await admin
        .from("facility_profile")
        .select(
          "facility_name, area, featured_image_url, avg_rating",
        )
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Facility not found: ${error.message}`);

      return {
        title: data.facility_name,
        subtitle: data.area,
        image_url: data.featured_image_url,
        rating: data.avg_rating ?? 0,
        rating_count: 0,
      };
    }

    case "fitness_plan": {
      const { data, error } = await admin
        .from("fitness_plans")
        .select("title, description, average_rating, rating_count")
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Fitness plan not found: ${error.message}`);

      return {
        title: data.title,
        subtitle: data.description,
        image_url: null,
        rating: data.average_rating,
        rating_count: data.rating_count,
      };
    }

    case "outdoor_route": {
      const { data, error } = await admin
        .from("fitness_outdoor_routes")
        .select("name, area, image_url")
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Outdoor route not found: ${error.message}`);

      return {
        title: data.name,
        subtitle: data.area,
        image_url: Array.isArray(data.image_url)
          ? data.image_url[0]
          : data.image_url,
        rating: null,
        rating_count: null,
      };
    }

    case "outdoor_event": {
      const { data, error } = await admin
        .from("fitness_outdoor_events")
        .select("title, area")
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Outdoor event not found: ${error.message}`);

      return {
        title: data.title,
        subtitle: data.area,
        image_url: null,
        rating: null,
        rating_count: null,
      };
    }

    case "challenge": {
      const { data, error } = await admin
        .from("fitness_challenges")
        .select("title, description")
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Challenge not found: ${error.message}`);

      return {
        title: data.title,
        subtitle: data.description,
        image_url: null,
        rating: null,
        rating_count: null,
      };
    }

    case "exercise": {
      const { data, error } = await admin
        .from("fitness_exercises")
        .select("exercise_name, primary_muscle_group, thumbnail_url")
        .eq("id", item_id)
        .single();

      if (error) throw new Error(`Exercise not found: ${error.message}`);

      return {
        title: data.exercise_name,
        subtitle: data.primary_muscle_group,
        image_url: data.thumbnail_url,
        rating: null,
        rating_count: null,
      };
    }

    default:
      throw new Error(`Unknown module type: ${module}`);
  }
}

// Handle subscription-driven top-rated placement
// Called when a facility subscription is activated or cancelled
export async function syncTopRatedForFacilitySubscription(
  facility_id: string,
  action: "activate" | "cancel" | "expire",
) {
  const admin = getSupabaseAdmin();

  // Check if facility has top_rated_placement privilege
  const { data: hasPrivilege, error: funcError } = await admin.rpc(
    "facility_has_privilege",
    {
      p_facility_id: facility_id,
      p_privilege: "top_rated_placement",
    },
  );

  if (funcError) throw new Error(funcError.message);

  if (action === "activate" && hasPrivilege) {
    // Upsert top-rated item for this facility
    const { data: facility, error: facilityError } = await admin
      .from("facility_profile")
      .select(
        "facility_name, area, featured_image_url, avg_rating",
      )
      .eq("id", facility_id)
      .single();

    if (facilityError) throw new Error(facilityError.message);

    const { error: upsertError } = await admin.from("top_rated_items").upsert({
      module: "facility",
      item_id: facility_id,
      title: facility.facility_name,
      subtitle: facility.area,
      image_url: facility.featured_image_url,
      rating: facility.avg_rating ?? 0,
      rating_count: 0,
      source: "subscription",
    });

    if (upsertError) throw new Error(upsertError.message);
  } else if ((action === "cancel" || action === "expire") && !hasPrivilege) {
    // Remove subscription-sourced top-rated item
    // Only if it's still subscription-sourced (not manually curated after)
    const { error: deleteError } = await admin
      .from("top_rated_items")
      .delete()
      .eq("module", "facility")
      .eq("item_id", facility_id)
      .eq("source", "subscription");

    if (deleteError) throw new Error(deleteError.message);
  }
}
