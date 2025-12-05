import React, { useEffect, useState, useRef } from "react";
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
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const {
    register,
    formState: { errors },
    handleSubmit,
    setValue,
    trigger,
  } = useForm({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (emailRef.current && passwordRef.current) {
        const emailValue = emailRef.current.value;
        const passwordValue = passwordRef.current.value;

        if (emailValue && passwordValue) {
          setValue("email", emailValue, { shouldValidate: true });
          setValue("password", passwordValue, { shouldValidate: true });
          trigger(); // Manually trigger validation
        }
      }
    }, 300); // Increased timeout to ensure autofill completes

    return () => clearTimeout(timer);
  }, [setValue, trigger]);

  const { ref: emailHookRef, ...emailRest } = register("email");
  const { ref: passwordHookRef, ...passwordRest } = register("password");

  // on submit function
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      // First, check if the email exists and retrieve the user's status
      const { data: userData, error: userError } = await supabase
        .from("user_profiles")
        .select("status, id, is_deleted")
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

      if (userData.is_deleted === true) {
        toast.error("Your account has been deleted. Please contact support.", {
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
          toast.error(
            "Failed to update last activity. Please try again later.",
            {
              position: "top-right",
              autoClose: 1500,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme: "light",
            }
          );
          setLoading(false);
          return;
        }
        toast.success("Login successful", {
          position: "top-right",
          autoClose: 1500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
        });
        router.push("/analytics");
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
        ref={(e) => {
          emailHookRef(e);
          emailRef.current = e;
        }}
        {...emailRest}
        register={register}
        error={errors?.email}
        autoComplete={"username"}
      />
      <Textinput
        name="password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        ref={(e) => {
          passwordHookRef(e);
          passwordRef.current = e;
        }}
        {...passwordRest}
        register={register}
        error={errors.password}
        hasicon={true}
        autoComplete={"current-password"}
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
      <Link
        href="/privacy-policy"
        className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-transparent text-sm font-semibold text-[#56ce84] underline-offset-2 hover:underline"
        target="_blank"
      >
        View Privacy Policy
      </Link>
    </form>
  );
};

export default LoginForm;
