import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { handleLogin } from "./store";
import { toast, ToastContainer } from "react-toastify";
import { supabase } from "@/app/utils/supabaseClient"; // Import supabase client

const schema = yup
  .object({
    email: yup.string().email("Invalid email").required("Email is Required"),
    password: yup.string().required("Password is Required"),
  })
  .required();

const LoginForm = () => {
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "all",
  });

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  // on submit function
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // First, check if the email exists and retrieve the user's status
      const { data: userData, error: userError } = await supabase
        .from("user_profiles")
        .select("status, id") // Select the user's status and id based on email
        .eq("email", data.email)
        .in("role", ["Admin", "Super Admin"])
        .single();

      if (userError) {
        toast.error("Error fetching user data.", {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
        setLoading(false);
        return;
      }

      // Check if the user status is true
      if (userData.status !== true) {
        toast.error("Your account is inactive. Please contact support.", {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
        setLoading(false);
        return;
      }

      // Proceed with login if status is true
      const resultAction = await dispatch(handleLogin(data)).unwrap();
      if (resultAction.isAuth) {
        
        // Update last_activity timestamp in Supabase (store as int8)
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({ last_activity: new Date().getTime() })
          .eq("id", userData.id);

        if (updateError) {
          toast.error("Failed to update last activity. Please try again later.", {
            position: "top-right",
            autoClose: 1500,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
          });
          setLoading(false);
          return;
        }
        router.push("/analytics");
        toast.success("Login successful", {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
      }
    } catch (error) {
      console.log(error);
      toast.error("Unexpected error. Please try again later.", {
        position: "top-right",
        autoClose: 1500,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: "light",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <ToastContainer />
      <Textinput
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email"
        register={register}
        error={errors?.email}
      />
      <Textinput
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        register={register}
        error={errors.password}
        hasicon={true}
      />
      <div className="flex justify-between">
        <Checkbox
          value={checked}
          onChange={() => setChecked(!checked)}
          label="Keep me signed in"
        />
        <Link
          href="/forgot-password2"
          className="text-sm text-slate-800 dark:text-slate-400 leading-6 font-medium"
        >
          Forgot Password?{" "}
        </Link>
      </div>

      <button className="btn bg-[#56ce84] text-white block w-full text-center">
        {loading ? "Signing..." : "Sign In"}
      </button>
    </form>
  );
};

export default LoginForm;
