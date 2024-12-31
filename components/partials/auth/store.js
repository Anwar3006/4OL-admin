import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { supabase } from "@/app/utils/supabaseClient";

// Function to initialize authentication state from localStorage
const initialIsAuth = () => {
  if (typeof window !== "undefined") {
    const item = window.localStorage.getItem("isAuth");
    return item ? JSON.parse(item) : false;
  }
  return false;
};

// Async thunk for handling login
export const handleLogin = createAsyncThunk(
  "auth/handleLogin",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const userId = data?.user?.id;

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        window.localStorage.setItem("user_id", userId);
      }
      return { isAuth: true, userId };
    } catch (error) {
      console.error('Login error:', error);
      toast.error((error.message || "Unknown error"), {
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
  async (_, { rejectWithValue }) => {
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("isAuth");
        window.localStorage.removeItem("user_id");
        window.localStorage.removeItem("user_role");
      }
      return { isAuth: false };
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
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(handleLogin.fulfilled, (state, action) => {
        state.isAuth = action.payload.isAuth;
        // toast.success("User logged in successfully", {
        //   position: "top-right",
        //   autoClose: 1500,
        //   hideProgressBar: false,
        //   closeOnClick: true,
        //   pauseOnHover: true,
        //   draggable: true,
        //   progress: undefined,
        //   theme: "light",
        // });
      })
      .addCase(handleLogout.fulfilled, (state, action) => {
        state.isAuth = action.payload.isAuth;
        toast.success("User logged out successfully", {
          position: "top-right",
        });
      });
  }
});

export default authSlice.reducer;
