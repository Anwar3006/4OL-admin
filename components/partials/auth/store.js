// components/partials/auth/store.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { supabase } from "@/app/utils/supabaseClient";
import { logAuthActivity } from "@/utils/activityLogger";
import { authClient } from "@/lib/auth-client";

const initialIsAuth = () => {
  if (typeof window !== "undefined") {
    const item = window.localStorage.getItem("isAuth");
    return item ? JSON.parse(item) : false;
  }
  return false;
};

const initialPermissions = () => {
  if (typeof window !== "undefined") {
    const permissions = window.localStorage.getItem("user_permissions");
    return permissions ? JSON.parse(permissions) : [];
  }
  return [];
};

const initialRole = () => {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("user_role") || "";
  }
  return "";
};

export const handleLogin = createAsyncThunk(
  "auth/handleLogin",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) throw result.error;

      const userId = result?.data?.user?.id;

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        if (userId) window.localStorage.setItem("user_id", userId);
        if (result?.data?.user?.email) {
          window.localStorage.setItem("user_email", result.data.user.email);
        }
      }

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, role")
        .eq("user_id", userId)
        .single();

      let userName = "Unknown User";
      let userRole = "";
      // permissions column does not exist in user_profiles — role-based access only
      let userPermissions = [];

      if (!profileError && profileData) {
        const fullName =
          `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim();
        userName = fullName || result?.data?.user?.email || "Unknown User";
        userRole = profileData.role || "";

        if (typeof window !== "undefined") {
          window.localStorage.setItem("user_role", userRole);
          window.localStorage.setItem(
            "user_permissions",
            JSON.stringify(userPermissions)
          );
        }
      } else {
        userName = result?.data?.user?.email || "Unknown User";
      }

      try {
        await logAuthActivity(userId, userName, "logged in");
      } catch (logError) {
        console.error("Failed to log login activity:", logError);
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

export const handleLogout = createAsyncThunk(
  "auth/handleLogout",
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState();
      const userId = state.auth.userId;

      if (userId) {
        try {
          let userName = "Unknown User";

          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("first_name, last_name")
            .eq("user_id", userId)
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
        } catch (logError) {
          console.error("Failed to log logout activity:", logError);
        }
      }

      const signOutResult = await authClient.signOut();
      if (signOutResult?.error) throw signOutResult.error;

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
    updatePermissions: (state, action) => {
      state.permissions = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "user_permissions",
          JSON.stringify(action.payload)
        );
      }
    },
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
