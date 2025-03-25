import { supabase } from "../utils/supabaseClient";

export const getPeriodTrackerLogs = async () => {
  try {
    const { data, error } = await supabase.from("tracker_logs").select(`
        *,
        user_profiles:user_id (
          first_name,
          last_name,
          avatar_url,
          is_tracker_notifications_enabled,
          region,
          phone_number,
          email,
          dob
        )
      `);

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error fetching tracker logs:", error.message);
    return { data: null, error };
  }
};

export const getUsersNotInTrackerLogs = async () => {
  try {
    const { data: trackerLogs } = await supabase
      .from("tracker_logs")
      .select("user_id");

    const trackerUserIds = trackerLogs.map((log) => log.user_id);

    const { data: users, error } = await supabase
      .from("user_profiles")
      .select("id, first_name, last_name, avatar_url")
      .not("id", "in", `(${trackerUserIds.join(",")})`);

    if (error) {
      throw error;
    }

    return { data: users, error: null };
  } catch (error) {
    console.error("Error fetching users not in tracker logs:", error.message);
    return { data: null, error };
  }
};

export const createPeriodTrackerLog = async (data) => {
  try {
    const { error } = await supabase.from("tracker_logs").insert(data);

    if (error) {
      throw error;
    }

    return { data: null, error: null };
  } catch (error) {
    console.error("Error creating tracker log:", error.message);
    return { data: null, error };
  }
};

export const updatePeriodTrackerLog = async (id, data) => {
  try {
    const { error } = await supabase
      .from("tracker_logs")
      .update(data)
      .eq("id", id);

    if (error) {
      throw error;
    }

    return { data: null, error: null };
  } catch (error) {
    console.error("Error updating tracker log:", error.message);
    return { data: null, error };
  }
};

export const deletePeriodTrackerLog = async (id) => {
  try {
    const { error } = await supabase.from("tracker_logs").delete().eq("id", id);

    if (error) {
      throw error;
    }

    return { data: null, error: null };
  } catch (error) {
    console.error("Error deleting tracker log:", error.message);
    return { data: null, error };
  }
};
