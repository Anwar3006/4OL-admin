import moment from "moment";
import { supabase } from "../utils/supabaseClient";

export const banners_ads = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Check if the user is authenticated using localStorage
    const isAuthenticated = localStorage.getItem('isAuth') === 'true';
    const userId = localStorage.getItem('user_id');

    if (!isAuthenticated || !userId) {
      console.error("User is not authenticated");
      errorCallback(new Error("User is not authenticated"));
      return;
    }

    // Proceed with inserting data into the healthcare_profiles table
    const { data: insertData, error: bannersAdsError } = await supabase
      .from("banners_ads")
      .insert([
        {
          created_at: moment(new Date()).valueOf(), // Convert date to timestamp
          updated_at: moment(new Date()).valueOf(), // Convert date to timestamp
          created_by: userId,
          updated_by: userId,
          is_created_by_admin_panel: true,
          headlines: user.headlines,
          description: user.description,
          callToAction: user.callToAction,
          mediaType: user.mediaType,
          mediaUrls: user.mediaUrls,
          starting_date_and_time: user.starting_date_and_time,
          end_date_and_time: user.end_date_and_time,
        },
      ]);

    if (bannersAdsError) {
      errorCallback(bannersAdsError);
      return;
    }

    successCallback(insertData);
  } catch (err) {
    errorCallback(err);
  }
};
