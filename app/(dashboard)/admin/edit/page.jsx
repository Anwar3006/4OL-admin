"use client";

import React from "react";
import Card from "@/components/ui/Card";
import EditUserProfile from "@/components/partials/auth/Admin/editUserProfile";

export default function page() {
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
              <EditUserProfile />
            </div>
          </Card>
        </div>
      </div>
    </div>
  </>
  )
}
