"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import dynamic from 'next/dynamic';
const MyGoogleMap = dynamic(() => import("@/components/partials/auth/map/googleMap"), { ssr: false });
// import MyGoogleMap from "@/components/partials/auth/map/googleMap";


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
               <MyGoogleMap />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
