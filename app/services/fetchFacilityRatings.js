import { supabase } from "../utils/supabaseClient"; // Adjust this import based on your setup

export const fetchFacilityRatings = async (from = 0, to = 13, search = "") => {
  let query = supabase
    .from("facility_reviews")
    .select(
      `
      id, 
      comment_text, 
      rating,
      is_published,
      is_verified_visit,
      helpful_count,
      created_at,
      user_profiles (
        user_id,
        first_name,
        last_name,
        email
      ),
      facility_profile (
        id,
        facility_name
      )
    `,
      { count: "exact" },
    );

  if (search) {
    query = query.or(`comment_text.ilike.%${search}%,facility_profile.facility_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("Error fetching facility ratings:", error.message);
    throw error;
  }

  // Format the result to match TFacilityReviewWithData schema
  const formattedData = data.map((item) => ({
    ...item,
    user_profiles: {
      user_id: item.user_profiles?.user_id,
      name: `${item.user_profiles?.first_name || ""} ${item.user_profiles?.last_name || ""}`.trim() || "Anonymous",
      email: item.user_profiles?.email,
    },
    facility_profile: {
      id: item.facility_profile?.id,
      facility_name: item.facility_profile?.facility_name || "N/A",
    },
  }));

  return { ratings: formattedData, count };
};
