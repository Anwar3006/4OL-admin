'use client'
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { resetPassword } from "@/app/services/login";
import Link from "next/link";
import Textinput from "@/components/ui/Textinput";
import useDarkmode from "@/hooks/useDarkMode";

const schema = yup
  .object({
    newPassword: yup.string().required("New password is required"),
    confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Passwords must match').required('Confirm password is required'),
  })
  .required();

const ResetPassword = () => {
  const [isDark] = useDarkmode();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedEmail = localStorage.getItem('email');
    if (savedToken && savedEmail) {
      setToken(savedToken);
      setEmail(savedEmail);
    } else {
      console.error("Token or Email not found in local storage");
    }
  }, []);

  const onSubmit = async (data) => {
    if (!email || !token) {
      console.error("Email or Token is not available");
      return;
    }
  
    const { newPassword } = data;
    setLoading(true);
  
    try {
      const response = await resetPassword(newPassword, token, email);
      if (response.error) {
        console.error("Error:", response.error.message || "Password reset failed.");
      } else {
        console.log("Password reset successful");
        router.push("/login2");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };
  
  

  if (!token) {
    return <p>Loading...</p>;
  }

  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box h-full flex flex-col justify-center">
              <div className="mobile-logo text-center mb-6 lg:hidden block">
                <Link href="/">
                  <img
                    src={
                      isDark
                        ? "/assets/images/logo/logo-white.svg"
                        : "/assets/images/logo/logo.svg"
                    }
                    alt=""
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center 2xl:mb-10 mb-5">
                <h4 className="font-medium">Reset Password</h4>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Textinput
                  name="newPassword"
                  label="New Password"
                  type="password"
                  placeholder="Enter your new password"
                  register={register}
                  error={errors.newPassword}
                />
                {errors.newPassword && <p>{errors.newPassword.message}</p>}
                
                <Textinput
                  name='confirmPassword'
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm your new password"
                  register={register}
                  error={errors.confirmPassword}
                />
                {errors.confirmPassword && <p>{errors.confirmPassword.message}</p>}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="btn bg-[#56ce84] text-white block w-full text-center"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
              <div className="max-w-[225px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-6 uppercase text-sm">
                Go To The{" "}
                <Link
                  href="/login2"
                  className="text-slate-900 dark:text-white font-medium hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="auth-footer text-center">
              Copyright 2021, Dashcode All Rights Reserved.
            </div>
          </div>
        </div>

        <div
          className="left-column bg-cover bg-no-repeat bg-center"
          style={{
            backgroundImage: `url('/assets/images/all-img/4 Our Life.png')`,
            height: "100vh",
          }}
        >
          <div className="flex flex-col h-full justify-center">
            <div className="flex-1 flex flex-col justify-center items-center">
              <Link href="/">
                {/* Placeholder for logo or other content */}
              </Link>
            </div>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
