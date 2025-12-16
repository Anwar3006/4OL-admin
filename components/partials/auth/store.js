// components/partials/auth/store.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { supabase } from "@/app/utils/supabaseClient";
import { logAuthActivity } from "@/utils/activityLogger";

// Function to initialize authentication state from localStorage
const initialIsAuth = () => {
  if (typeof window !== "undefined") {
    const item = window.localStorage.getItem("isAuth");
    return item ? JSON.parse(item) : false;
  }
  return false;
};

// Function to get initial permissions
const initialPermissions = () => {
  if (typeof window !== "undefined") {
    const permissions = window.localStorage.getItem("user_permissions");
    return permissions ? JSON.parse(permissions) : [];
  }
  return [];
};

// Function to get initial role
const initialRole = () => {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("user_role") || "";
  }
  return "";
};

// Async thunk for handling login
export const handleLogin = createAsyncThunk(
  "auth/handleLogin",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const userId = data?.user?.id;
      console.log(data);

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        window.localStorage.setItem("user_id", userId);
        window.localStorage.setItem("user_email", data.user.email);
      }

      // Fetch user profile including permissions
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, role, permissions")
        .eq("id", userId)
        .single();

      let userName = "Unknown User";
      let userRole = "";
      let userPermissions = [];

      if (!profileError && profileData) {
        const fullName =
          `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim();
        userName = fullName || data.user.email || "Unknown User";
        userRole = profileData.role || "";
        userPermissions = profileData.permissions || [];

        // Store role and permissions in localStorage
        if (typeof window !== "undefined") {
          window.localStorage.setItem("user_role", userRole);
          window.localStorage.setItem(
            "user_permissions",
            JSON.stringify(userPermissions)
          );
        }
      } else {
        userName = data.user.email || "Unknown User";
      }

      // Log the login activity
      try {
        await logAuthActivity(userId, userName, "logged in");
        console.log("Login activity logged successfully for user:", userName);
      } catch (logError) {
        console.error("Failed to log login activity:", logError);
        // Don't fail login if logging fails
      }

      return {
        isAuth: true,
        userId,
        role: userRole,
        permissions: userPermissions,
      };
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Unknown error", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
      return rejectWithValue(error.message || "Unknown error");
    }
  }
);

// Async thunk for handling logout
export const handleLogout = createAsyncThunk(
  "auth/handleLogout",
  async (_, { rejectWithValue, getState }) => {
    try {
      // Get current user info before logout
      const state = getState();
      const userId = state.auth.userId;

      // Log the logout activity
      if (userId) {
        try {
          let userName = "Unknown User";

          // Get user's full name from user_profiles table
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("id", userId)
            .single();

          if (!profileError && profileData) {
            const fullName =
              `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim();
            userName =
              fullName || localStorage.getItem("user_email") || "Unknown User";
          } else {
            userName =
              typeof window !== "undefined"
                ? localStorage.getItem("user_email") || "Unknown User"
                : "Unknown User";
          }

          await logAuthActivity(userId, userName, "logged out");
          console.log(
            "Logout activity logged successfully for user:",
            userName
          );
        } catch (logError) {
          console.error("Failed to log logout activity:", logError);
          // Don't fail logout if logging fails
        }
      }

      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("isAuth");
        window.localStorage.removeItem("user_id");
        window.localStorage.removeItem("user_role");
        window.localStorage.removeItem("user_email");
        window.localStorage.removeItem("user_permissions");
      }
      return {
        isAuth: false,
        role: "",
        permissions: [],
      };
    } catch (error) {
      toast.error("Logout failed: " + (error.message || "Unknown error"), {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
      return rejectWithValue(error.message || "Unknown error");
    }
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    isAuth: initialIsAuth(),
    role: initialRole(),
    permissions: initialPermissions(),
    userId:
      typeof window !== "undefined" ? localStorage.getItem("user_id") : null,
  },
  reducers: {
    // Action to update permissions without re-login
    updatePermissions: (state, action) => {
      state.permissions = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "user_permissions",
          JSON.stringify(action.payload)
        );
      }
    },
    // Action to update role
    updateRole: (state, action) => {
      state.role = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("user_role", action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(handleLogin.fulfilled, (state, action) => {
        state.isAuth = action.payload.isAuth;
        state.userId = action.payload.userId;
        state.role = action.payload.role;
        state.permissions = action.payload.permissions;
      })
      .addCase(handleLogout.fulfilled, (state, action) => {
        state.isAuth = action.payload.isAuth;
        state.userId = null;
        state.role = action.payload.role;
        state.permissions = action.payload.permissions;
        toast.success("User logged out successfully", {
          position: "top-right",
        });
      });
  },
});

export const { updatePermissions, updateRole } = authSlice.actions;
export default authSlice.reducer;
