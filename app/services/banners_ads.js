import moment from "moment";
import { supabase } from "../utils/supabaseClient";
import { toast } from "react-toastify";

export const banners_ads = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Check if the user is authenticated using localStorage
    const isAuthenticated = localStorage.getItem("isAuth") === "true";
    const userId = localStorage.getItem("user_id");

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

export const getBannersAds = async () => {
  try {
    const { data: adsData, error: adsError } = await supabase
      .from("banners_ads")
      .select("*")
      .eq("bannerType", "ads")
      .is("isPublished", true)
      .limit(3)
      .gt("end_date_and_time", new Date().toISOString())
      .order("created_at", { ascending: false });

    const { data: newsData, error: newsError } = await supabase
      .from("banners_ads")
      .select("*")
      .eq("bannerType", "news")
      .is("isPublished", true)
      .limit(3)
      .gt("end_date_and_time", new Date().toISOString())
      .order("created_at", { ascending: false });

    const { data: healthData, error: healthError } = await supabase
      .from("banners_ads")
      .select("*")
      .eq("bannerType", "health")
      .is("isPublished", true)
      .limit(3)
      .gt("end_date_and_time", new Date().toISOString())
      .order("created_at", { ascending: false });

    const { data: eventsData, error: eventsError } = await supabase
      .from("banners_ads")
      .select("*")
      .eq("bannerType", "events")
      .is("isPublished", true)
      .limit(3)
      .gt("end_date_and_time", new Date().toISOString())
      .order("created_at", { ascending: false });

    const { data: archiveData, error: archiveError } = await supabase
      .from("banners_ads")
      .select("*")
      .order("created_at", { ascending: false })
      .is("isPublished", false);

    const { data: scheduledData, error: scheduledError } = await supabase
      .from("banners_ads")
      .select("*")
      .gt("starting_date_and_time", new Date().toISOString())
      .gt("end_date_and_time", new Date().toISOString())
      .order("created_at", { ascending: false })
      .is("isPublished", true);

    if (
      adsError ||
      newsError ||
      healthError ||
      eventsError ||
      archiveError ||
      scheduledError
    ) {
      console.log(adsError || newsError || healthError || eventsError);
      toast.error("Error fetching Ads data");
    }

    return {
      adsData,
      newsData,
      healthData,
      eventsData,
      archiveData,
      scheduledData,
    };
  } catch (err) {
    console.log(err);
    return null;
  }
};

export const changeStatus = async (id, status) => {
  try {
    const { error } = await supabase
      .from("banners_ads")
      .update({ isPublished: status })
      .eq("id", id);

    if (error) {
      console.log(error);
      toast.error("Error updating status", error);
    }
    toast.success("Ad Status updated successfully");
  } catch (err) {
    toast.error("Error updating status", err);
    console.log(err);
  }
};

export const deleteAd = async (id) => {
  try {
    const { error } = await supabase.from("banners_ads").delete().eq("id", id);

    if (error) {
      console.log(error);
      toast.error("Error deleting Ad", error);
    }
    toast.success("Ad deleted successfully");
  } catch (err) {
    toast.error("Error deleting Ad", err);
    console.log(err);
  }
};

export const handleArchive = async (id, status, category) => {};

export const getExistingAdsDuration = async () => {
  const { data: adsData, error: adsError } = await supabase
    .from("banners_ads")
    .select("duration")
    .limit(1);

  if (adsError) {
    console.error("ERROR GETTING DURATION: ", adsError);
    return;
  }

  return adsData[0].duration;
};
