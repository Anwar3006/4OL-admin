import { logUserActivity } from "@/utils/activityLogger";
import { encryptPassword } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";
import { authClient } from "@/lib/auth-client";
import moment from "moment";

export const signup = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    const createdById = localStorage.getItem("user_id");

    const signupResult = await authClient.signUp.email({
      email: user.email,
      password: user.password,
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
    });

    if (signupResult.error) {
      errorCallback(signupResult.error);
      return;
    }

    const userId = signupResult.data?.user?.id;
    if (userId) {
      const encryptedPassword = encryptPassword(user.password);
      const updatedUser = { ...user };
      delete updatedUser["confirm_password"];
      delete updatedUser["password"];

      const { error: updateError } = await supabase.from("user_profiles").insert([
        {
          ...updatedUser,
          id: userId,
          password: encryptedPassword,
          created_by: createdById || userId,
          updated_by: createdById || userId,
          is_created_by_admin_panel: true,
          dob: moment(user.dob).format("YYYY-MM-DD"),
        },
      ]);

      if (updateError) {
        try {
          await authClient.deleteUser(userId);
        } catch (rollbackError) {
          console.error("Failed rolling back auth user:", rollbackError);
        }
        errorCallback(updateError);
        return;
      }

      try {
        let creatorName = "Unknown User";

        if (createdById) {
          const { data: creatorProfile, error: creatorError } = await supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("id", createdById)
            .single();

          if (!creatorError && creatorProfile) {
            const fullName =
              `${creatorProfile.first_name || ""} ${creatorProfile.last_name || ""}`.trim();
            creatorName =
              fullName || localStorage.getItem("user_email") || "Unknown User";
          } else {
            creatorName =
              typeof window !== "undefined"
                ? localStorage.getItem("user_email") || "Unknown User"
                : "Unknown User";
          }
        } else {
          creatorName =
            typeof window !== "undefined"
              ? localStorage.getItem("user_email") || "Unknown User"
              : "Unknown User";
        }

        await logUserActivity(
          createdById || userId,
          creatorName,
          "created new user",
          userId,
          null
        );
      } catch (logError) {
        console.warn("Failed to log user creation activity:", logError);
      }

      successCallback(signupResult.data);
    } else {
      errorCallback(new Error("User ID is not available."));
    }
  } catch (err) {
    errorCallback(err);
  }
};
