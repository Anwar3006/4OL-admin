"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import AdsForm from "@/components/partials/auth/ads_form";
import Overview from "@/components/partials/auth/map/overview";
import MapOverview from "@/components/partials/auth/map/MapOverview";
import MyGoogleMap from "@/components/partials/auth/map/googleMap";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Map Overview"}
              bodyClass="max-sm:p-2 p-6"
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className=" w-full flex flex-col justify-center">
               {/* <Overview /> */}
              {/* <MapOverview /> */}
               <MyGoogleMap />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
