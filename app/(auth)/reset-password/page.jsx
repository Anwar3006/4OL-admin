'use client';
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
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('newPassword')], 'Passwords must match')
      .required('Confirm password is required'),
  })
  .required();

const ResetPassword = () => {
    const [isDark] = useDarkmode();
  const router = useRouter();
  const [token, setToken] = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    // Retrieve token from local storage
    const savedToken = localStorage.getItem('user_id');
    if (savedToken) {
      setToken(savedToken);
    } else {
      console.error("Token not found in local storage");
    }
  }, []);

  const onSubmit = async (data) => {
    if (!token) {
      console.error("Token is not available");
      return;
    }
    
    const { newPassword } = data;
    try {
      await resetPassword(
        newPassword,
        token, // Use the token as email or identifier
        () => console.log("Loading..."),
        () => router.push('/login'),
        (error) => console.error("Error:", error)
      );
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  if (!token) {
    return <p>Loading...</p>; // or a spinner/loading component
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
                  <h4 className="font-medium">Sign up</h4>
                  <div className="text-slate-500 dark:text-slate-400 text-base">
                    Create an account
                  </div>
                </div>

                {/* reset form */}
                 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                 <Textinput
        name="password"
        label="Password"
        type="password"
        icon={"eye"}
        placeholder="Enter your New Password"
        register={register}
        error={errors.password}
      />
          <Textinput
        name="password"
        label="Password"
        type="password"
        icon={"eye"}
        placeholder="Confirm Password"
        register={register}
        error={errors.password}
      />
       <button className="btn bg-[#56ce84] text-white block w-full text-center">Reset Password</button>
     </form>
               
                <div className="max-w-[225px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-6 uppercase text-sm">
                  Already registered?
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

          {/* right column */}
          <div
            className="left-column bg-cover bg-no-repeat bg-center"
            style={{
              backgroundImage: `url('/assets/images/all-img/4 Our Life.png')`,
              height: "100vh", // Ensure it has a height
            }}
          >
            <div className="flex flex-col h-full justify-center">
              <div className="flex-1 flex flex-col justify-center items-center">
                <Link href="/">
             
                </Link>
              </div>
              <div>
              </div>
            </div>
          </div>
        </div>
      </div>
   
  );
};

export default ResetPassword;
