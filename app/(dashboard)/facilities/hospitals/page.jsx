"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import HospitalsListing from "@/components/partials/auth/Facilities/Hospitals/HospitalListing";

const Hospitals = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <HospitalsListing />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Hospitals;
