// app/services/login.js
import { decryptPassword } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";
import { authClient } from "@/lib/auth-client";

export const login = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    let emailOrPhone = user.emailOrPhone;
    console.log("Attempting to login with:", emailOrPhone);

    if (!emailOrPhone.includes("@")) {
      const { data: userProfileByPhone, error: phoneFetchError } =
        await supabase
          .from("user_profiles")
          .select("email")
          .eq("phone_number", `+${emailOrPhone}`)
          .single();

      if (phoneFetchError || !userProfileByPhone?.email) {
        console.error("Error fetching user by phone:", phoneFetchError);
        errorCallback(new Error("No user found with the given phone number."));
        return;
      }
      emailOrPhone = userProfileByPhone.email;
    }

    const decryptedPassword = decryptPassword(user.passcode);

    const signInResult = await authClient.signIn.email({
      email: emailOrPhone,
      password: decryptedPassword,
    });

    if (signInResult.error) {
      console.error("Sign-in error:", signInResult.error);
      errorCallback(signInResult.error);
      return;
    }

    const sessionResult = await authClient.getSession();
    const userId =
      signInResult.data?.user?.id || sessionResult?.data?.user?.id || null;

    if (!userId) {
      errorCallback(new Error("User ID is not available."));
      return;
    }

    const { data: userProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchError) {
      console.error("Error fetching user profile:", fetchError);
      errorCallback(fetchError);
      return;
    }

    localStorage.setItem("user_id", userId);
    localStorage.setItem("user_role", userProfile.role || "");
    localStorage.setItem("user_email", userProfile.email || "");

    const permissions = userProfile.permissions || [];
    localStorage.setItem("user_permissions", JSON.stringify(permissions));

    console.log("User permissions loaded:", permissions);
    successCallback(userProfile);
  } catch (err) {
    console.error("Unexpected error:", err);
    if (typeof errorCallback === "function") {
      errorCallback(err);
    } else {
      console.error("Error callback is not a function");
    }
  }
};

export const logout = async (loadCallback, successCallback, errorCallback) => {
  try {
    loadCallback();
    const signOutResult = await authClient.signOut();

    if (signOutResult?.error) {
      errorCallback(signOutResult.error);
      return;
    }

    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_permissions");

    successCallback();
  } catch (err) {
    errorCallback(err);
  }
};

export const sendOtpToEmail = async (
  email,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password`;

    const { data, error } = await authClient.requestPasswordReset({
      email,
      redirectTo,
    });

    if (error) {
      errorCallback(error);
    } else {
      successCallback(data);
    }
  } catch (err) {
    errorCallback(err);
  }
};

export const verifyOtpSentToEmail = async (email, otp) => {
  try {
    if (!otp) {
      throw new Error("Reset token is required.");
    }

    localStorage.setItem("token", otp);
    localStorage.setItem("email", email);

    return { status: true };
  } catch (err) {
    console.error("Token verification error:", err);
    throw err;
  }
};

export const resetPassword = async (
  newPassword,
  successCallback,
  errorCallback,
  tokenInput
) => {
  try {
    const tokenFromStorage =
      typeof window !== "undefined" ? localStorage.getItem("token") : undefined;
    const token = tokenInput || tokenFromStorage || undefined;

    const { data, error } = await authClient.resetPassword({
      newPassword,
      token,
    });

    if (error) {
      console.error("Password update failed:", error);
      errorCallback(error);
      return;
    }

    console.log("Password update successful:", data);

    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("email");
    }

    successCallback();
  } catch (err) {
    console.error("Unexpected error during password reset:", err);
    errorCallback(err);
  }
};
