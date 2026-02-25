import { supabase } from "../utils/supabaseClient"; // Adjust this import based on your setup

export const fetchFacilityRatings = async (from = 0, to = 13) => {
  const { data, error, count } = await supabase
    .from("facility_ratings")
    .select(
      `
      id, comment, rating,
      user_profiles (
        first_name,
        last_name
      ),
      facility_profile (
        facility_name
      )
    `,
      { count: "exact" }
    )
    .range(from, to);

  if (error) {
    console.error("Error fetching facility ratings:", error.message);
    throw error;
  }

  // Optional: format the result to simplify usage
  const formattedData = data.map((item) => ({
    id: item?.id,
    comment: item?.comment,
    rating: item?.rating,
    first_name: item.user_profiles?.first_name,
    last_name: item.user_profiles?.last_name,
    facility_name: item.facility_profile?.facility_name,
  }));

  return { ratings: formattedData, count };
};
