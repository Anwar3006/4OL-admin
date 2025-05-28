import { supabase } from "@/app/utils/supabaseClient";

/**
 * Delete a user account and all related data
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise<{success: boolean, message: string, error?: any}>}
 */
export const deleteUserAccount = async ({ email, password }) => {
  try {
    // Step 1: Authenticate the user
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      return {
        success: false,
        message: "Invalid credentials. Please verify your email and password.",
        error: authError,
      };
    }

    // Step 2: Get the user profile data
    const { data: userData, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (userError) {
      return {
        success: false,
        message: "Error retrieving account information.",
        error: userError,
      };
    }

    // Step 3: Call the RPC function to delete the user and all related data
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

    // Success
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
