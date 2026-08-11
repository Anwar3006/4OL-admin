"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
// import ForgotPass from "@/components/redesign/auth/forgot-pass";
import useDarkMode from "@/hooks/useDarkMode";

const ForgotPass2 = () => {
  const [isDark] = useDarkMode();
  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box2 flex flex-col justify-center h-full">
              <div className="mobile-logo text-center mb-6 lg:hidden block">
                <Link href="/">
                  <Image
                    src={
                      isDark
                        ? "/assets/images/logo/logo-white.svg"
                        : "/assets/images/logo/logo.svg"
                    }
                    alt=""
                    width={160}
                    height={64}
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center 2xl:mb-10 mb-5">
                <h4 className="font-medium mb-4">Forgot Your Password?</h4>
                <div className="text-slate-500 dark:text-slate-400 text-base">
                  Reset Password.
                </div>
              </div>
              <div className="font-normal text-base text-slate-500 dark:text-slate-400 text-center px-2 bg-slate-100 dark:bg-slate-600 rounded py-3 mb-4 mt-10">
                Enter your Email and instructions will be sent to you!
              </div>

              {/* <ForgotPass /> */}
              <div className="md:max-w-[345px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-8 uppercase text-sm">
               
                <Link
                  href="/"
                  className="text-slate-900 dark:text-white font-medium hover:underline"
                >
                  Send me Back{" "}
                </Link>
                to The Sign In
              </div>
            </div>
            <div className="auth-footer text-center">
              Copyright 2024, 4-Our Life All Rights Reserved.
            </div>
          </div>
        </div>
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
                {/* <div className="black-500-title max-w-[525px] mx-auto pb-20 text-center">
        <p className="text-xl">Healthcare Simplified, Longevity Amplified.</p>
        <span className="text-white font-bold">performance</span>
      </div> */}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ForgotPass2;
