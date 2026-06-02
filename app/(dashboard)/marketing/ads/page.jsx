"use client";
import React from "react";
import Card from "@/components/ui/Card";
// import AdsForm from "@/components/redesign/auth/ads_form";

export default function page() {
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Advertisement"}
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className=" w-full flex flex-col justify-center sm:p-5">
                {/* <AdsForm type="ads" /> */}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
