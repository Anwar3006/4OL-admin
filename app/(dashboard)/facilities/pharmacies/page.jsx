"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import PharmaciesListing from "@/components/partials/auth/Facilities/Pharmacies/PharmaciesListing";

const Pharmacies = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <PharmaciesListing />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pharmacies;
