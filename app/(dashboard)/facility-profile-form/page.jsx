"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import FacilityProfileForm from "@/components/partials/auth/healthcare-profile-form";

export default function page() {
    const [isDark] = useDarkmode();
  return (
    <>
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative w-full">
          <Card
            title={"Healthcare Facility Profile"}
            className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
          >
            <div className=" lg:w-[80%] w-[90%] flex flex-col justify-center p-5">
              <FacilityProfileForm />
            </div>
          </Card>
        </div>
      </div>
    </div>
  </>
  )
}
