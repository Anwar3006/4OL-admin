"use client";
import React from "react";
import Link from "next/link";
import LoginForm from "@/components/partials/auth/login-form";
import useDarkMode from "@/hooks/useDarkMode";

const Login2 = () => {
  const [isDark] = useDarkMode();
  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box h-full flex flex-col justify-center">
              <div className="mobile-logo text-center mb-6 lg:hidden block w-10 mx-auto">
                <Link href="/">
                  <img
                    src="/assets/images/all-img/logo-green.png"
                    alt=""
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center 2xl:mb-10 mb-4">
                <h4 className="font-medium">Sign in</h4>
                <div className="text-[#56ce84] text-base">
                  Sign in to your account to continue.
                </div>
              </div>
              <LoginForm />
              {/* <div className="md:max-w-[345px] mt-6 mx-auto font-normal text-slate-500 dark:text-slate-400mt-12 uppercase text-sm">
                  Don’t have an account?{" "}
                  <Link
                    href="/register2"
                    className="text-slate-900 dark:text-white font-medium hover:underline"
                  >
                    Sign up
                  </Link>
                </div> */}
            </div>
            <div className="auth-footer text-center">
              <Link
                href="/privacy-policy"
                className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-transparent text-sm font-semibold text-[#56ce84] underline-offset-2 hover:underline"
                target="_blank"
              >
                Privacy Policy
              </Link>
              Copyright 2024, 4-Our Life All Rights Reserved.
            </div>
          </div>
        </div>

        {/* right side */}
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

export default Login2;
