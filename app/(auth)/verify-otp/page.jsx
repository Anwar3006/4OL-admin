"use client";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { verifyOtpSentToEmail } from "@/app/services/login";
import { useRouter } from "next/navigation";
import Textinput from "@/components/ui/Textinput";
import Link from "next/link";
import useDarkmode from "@/hooks/useDarkMode";

const schema = yup
  .object({
    otp: yup.string().required("OTP is required"),
  })
  .required();

const VerifyOtp = () => {
  const [isDark] = useDarkmode();
  const [errorMessage, setErrorMessage] = useState(null);
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (data) => {
    const { otp } = data;
    setLoading(true);
    setErrorMessage(null);
  
    try {
      const email = localStorage.getItem("email");
      if (!email) {
        setErrorMessage("Email not found in local storage.");
        return;
      }
  
      const response = await verifyOtpSentToEmail(email, otp);
      if (response.error) {
        setErrorMessage(response.error.message || "Verification failed.");
      } else {
        localStorage.setItem("token", response.token); // Store the token in local storage
        router.push("/reset-password");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  

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
                <h4 className="font-medium">Verify OTP</h4>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Textinput
                  name="otp"
                  label="OTP"
                  type="text"
                  placeholder="Enter your OTP"
                  register={register}
                  error={errors.otp}
                />
                {errorMessage && (
                  <p className="text-red-500">{errorMessage}</p>
                )}
                <button
                  type="submit"
                  className="btn bg-[#56ce84] text-white block w-full text-center"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
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
              <Link href="/">{/* Add your branding or logo here */}</Link>
            </div>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
