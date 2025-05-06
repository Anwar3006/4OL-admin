import { supabase } from "../utils/supabaseClient"; // Adjust this import based on your setup

export const fetchFacilityRatings = async () => {
  const { data, error } = await supabase.from("facility_ratings").select(`
      comment, rating,
      user_profiles (
        first_name,
        last_name
      ),
      healthcare_profiles (
        facility_name
      )
    `);

  if (error) {
    console.error("Error fetching facility ratings:", error.message);
    throw error;
  }

  // Optional: format the result to simplify usage
  const formattedData = data.map((item) => ({
    comment: item.comment,
    rating: item.rating,
    first_name: item.user_profiles?.first_name,
    last_name: item.user_profiles?.last_name,
    facility_name: item.healthcare_profiles?.facility_name,
  }));

  return formattedData;
};
