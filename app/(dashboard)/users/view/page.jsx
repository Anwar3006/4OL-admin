"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
// import ViewUserDetails from "@/components/redesign/auth/Users/ViewUserDetials";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">  
              <div className=" w-full flex flex-col justify-center sm:p-5">
                {/* <ViewUserDetails /> */}
              </div>
          </div>
        </div>
      </div>
    </>
  );
}
