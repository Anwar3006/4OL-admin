"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import EditFacilityProfileForm from "@/components/partials/auth/Facilities/edit-facility-profile-form";

export default function page() {
    const [isDark] = useDarkmode();
  return (
    <>
    <div className="">
      <div className="lg-inner-column">
        <div className="right-column relative w-full">
          <Card
            title={"Edit Facility"}
            className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
          >
            <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-5">
              <EditFacilityProfileForm />
            </div>
          </Card>
        </div>
      </div>
    </div>
  </>
  )
}
