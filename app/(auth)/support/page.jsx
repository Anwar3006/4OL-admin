"use client";
import React from "react";
import Link from "next/link";
import SupportForm from "@/components/partials/auth/support-form";
import useDarkMode from "@/hooks/useDarkMode";

const SupportPage = () => {
  const [isDark] = useDarkMode();
  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box2 flex flex-col justify-center h-full">
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
                <h4 className="font-medium mb-4">Contact Support</h4>
                <div className="text-slate-500 dark:text-slate-400 text-base">
                  We're here to help! Send us a message and we'll get back to you as soon as possible.
                </div>
              </div>
              <div className="font-normal text-base text-slate-500 dark:text-slate-400 text-center px-2 bg-slate-100 dark:bg-slate-600 rounded py-3 mb-4 mt-10">
                Fill out the form below and our team will respond to you shortly!
              </div>

              <SupportForm />
              <div className="md:max-w-[345px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-8 uppercase text-sm">
                <Link
                  href="/"
                  className="text-slate-900 dark:text-white font-medium hover:underline"
                >
                  Back to Home
                </Link>
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
            height: "100vh",
          }}
        >
          <div className="flex flex-col h-full justify-center">
            <div className="flex-1 flex flex-col justify-center items-center">
              <Link href="/"></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;

