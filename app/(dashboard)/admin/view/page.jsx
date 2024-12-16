"use client";

import React from "react";
import Card from "@/components/ui/Card";
import ViewUserProfile from "@/components/partials/auth/Admin/viewUserProfile";

export default function page() {
  return (
    <>
    <div className="">
      <div className="lg-inner-column">
        <div className="right-column relative w-full">
            <div className="w-full flex flex-col justify-center sm:p-5">
             <ViewUserProfile/>
            </div>
        </div>
      </div>
    </div>
  </>
  )
}
