import { supabase } from "@/app/utils/supabaseClient";
import { authClient } from "@/lib/auth-client";

/**
 * Delete a user account and all related data
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<{success: boolean, message: string, error?: any}>}
 */
export const deleteUserAccount = async ({ email, password }) => {
  try {
    const verifyResult = await authClient.verifyPassword({ password });

    if (verifyResult?.error || verifyResult?.data?.status !== true) {
      return {
        success: false,
        message: "Invalid credentials. Please verify your email and password.",
        error: verifyResult?.error,
      };
    }

    const sessionResult = await authClient.getSession();
    const sessionUser = sessionResult?.data?.user;

    if (!sessionUser) {
      return {
        success: false,
        message: "Unable to resolve active auth session.",
      };
    }

    if (sessionUser.email?.toLowerCase() !== email?.toLowerCase()) {
      return {
        success: false,
        message: "Email does not match the currently signed-in account.",
      };
    }

    const { data: userData, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", sessionUser.id)
      .single();

    if (userError) {
      return {
        success: false,
        message: "Error retrieving account information.",
        error: userError,
      };
    }

    const { error: deleteError } = await supabase.rpc(
      "delete_user_and_related_data",
      { p_user_id: userData.id }
    );

    if (deleteError) {
      return {
        success: false,
        message: "Failed to delete account and related data.",
        error: deleteError,
      };
    }

    return {
      success: true,
      message: "Account successfully deleted",
    };
  } catch (error) {
    console.error("Delete account error:", error);
    return {
      success: false,
      message: "An unexpected error occurred while deleting the account.",
      error,
    };
  }
};
