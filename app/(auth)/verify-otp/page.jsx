'use client'
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { verifyOtpSentToEmail } from '@/app/services/login';
import { useRouter } from 'next/navigation';
import Textinput from '@/components/ui/Textinput';
import Link from 'next/link';
import useDarkmode from '@/hooks/useDarkMode';

const schema = yup
  .object({
    otp: yup.string().required("OTP is required"),
  })
  .required();

const VerifyOtp = () => {
    const [isDark] = useDarkmode();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (data) => {
    const { otp } = data;
    setLoading(true);
    try {
      await verifyOtpSentToEmail(
        localStorage.getItem('email'), // Store email in localStorage when sending OTP
        otp,
        () => console.log("Loading..."),
        () => router.push('/reset-password'), // Redirect to reset-password page
        (error) => console.error("Error:", error)
      );
    } catch (err) {
      console.error("Unexpected error:", err);
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

            {/* verify otp form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Textinput
        // name="email"
        label="OTP"
        type="text"
        placeholder="Enter your OTP"
        register={register}
        error={errors.email}
      />
      {errors.otp && <p>{errors.otp.message}</p>}
      <button  type="submit" disabled={loading} className="btn bg-[#56ce84] text-white block w-full text-center">
        {loading ? "Verifying..." : "Verify OTP"}
      </button>
    </form>
            <div className="max-w-[225px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-6 uppercase text-sm">
              Go To The  {' '}
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
              {/* <h3 className="text-white font-bold">4 Our Life</h3> */}
              {/* <img
      src="assets/images/logo/logo-white.svg"
      alt=""
      className="mb-10"
    /> */}
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

export default VerifyOtp;
