import { logUserActivity } from "@/utils/activityLogger";
import { encryptPassword } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";
import moment from "moment";

export const signup = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    // Get creator's ID from localStorage
    const createdById = localStorage.getItem("user_id"); // Make sure you store this at login

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });

    if (signupError) {
      errorCallback(signupError);
      return;
    }

    const userId = signupData.user?.id;
    if (userId) {
      const encryptedPassword = encryptPassword(user.password);
      const updatedUser = { ...user };
      delete updatedUser["confirm_password"];
      delete updatedUser["password"];

      const { error: updateError } = await supabase
        .from("user_profiles")
        .insert([
          {
            ...updatedUser,
            id: userId,
            password: encryptedPassword,
            created_at: new Date().getTime(), // timestamp
            updated_at: new Date().getTime(), // timestamp
            created_by: createdById || userId, // fallback to self if no admin
            updated_by: createdById || userId, // fallback to self if no admin
            is_created_by_admin_panel: true,
            dob: moment(user.dob).format("YYYY-MM-DD"),
          },
        ]);

      if (updateError) {
        errorCallback(updateError);
        return;
      }

      // Log the user creation activity
      try {
        let creatorName = "Unknown User";
        
        // Get creator's full name from user_profiles table
        if (createdById) {
          const { data: creatorProfile, error: creatorError } = await supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("id", createdById)
            .single();

          if (!creatorError && creatorProfile) {
            const fullName = `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim();
            creatorName = fullName || localStorage.getItem("user_email") || "Unknown User";
          } else {
            creatorName = typeof window !== "undefined" ? localStorage.getItem("user_email") || "Unknown User" : "Unknown User";
          }
        } else {
          creatorName = typeof window !== "undefined" ? localStorage.getItem("user_email") || "Unknown User" : "Unknown User";
        }

        await logUserActivity(
          createdById || userId, // Creator's ID
          creatorName, // Creator's full name
          "created new user", // Action
          userId, // Target user ID (the newly created user)
          null // IP will be auto-detected
        );
      } catch (logError) {
        console.warn("Failed to log user creation activity:", logError);
        // Don't fail the signup if logging fails
      }

      successCallback(signupData);
    } else {
      errorCallback(new Error("User ID is not available."));
    }
  } catch (err) {
    errorCallback(err);
  }
};
