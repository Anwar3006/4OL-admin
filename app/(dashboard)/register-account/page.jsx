"use client";

import React from "react";
import Link from "next/link";
import RegForm from "@/components/partials/auth/reg-from";
import Social from "@/components/partials/auth/social";
import useDarkmode from "@/hooks/useDarkMode";
import { ToastContainer } from "react-toastify";

// image import

const Register2 = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <div className="inner-content h-full w-full flex flex-col bg-white dark:bg-slate-800">
              <div className=" h-full lg:w-[80%] w-[90%] flex flex-col justify-center p-5">
                {/* <div className="mobile-logo text-center mb-6 lg:hidden block">
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
                </div> */}
                <div className="text-center 2xl:mb-10 mb-5">
                  <h4 className="font-medium">Register Account</h4>
                  {/* <div className="text-slate-500 dark:text-slate-400 text-base">
                    Create an account
                  </div> */}
                </div>
                <RegForm />
                {/* <div className="max-w-[225px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-6 uppercase text-sm">
                  Already registered?
                  <Link
                    href="/login2"
                    className="text-slate-900 dark:text-white font-medium hover:underline"
                  >
                    Sign In
                  </Link>
                </div> */}
              </div>
              {/* <div className="auth-footer text-center">
                Copyright 2021, Dashcode All Rights Reserved.
              </div> */}
            </div>
          </div>

          {/* right column */}
          {/* <div
            className="left-column bg-cover bg-no-repeat bg-center"
            style={{
              backgroundImage: `url('/assets/images/all-img/4 Our Life.png')`,
              height: "120vh", // Ensure it has a height
            }}
          >
            <div className="flex flex-col h-full justify-center">
              <div className="flex-1 flex flex-col justify-center items-center">
                <Link href="/">
                  <h3 className="text-white font-bold">4 Our Life</h3>
                  <img
          src="assets/images/logo/logo-white.svg"
          alt=""
          className="mb-10"
        />
                </Link>
              </div>
              <div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </>
  );
};

export default Register2;
