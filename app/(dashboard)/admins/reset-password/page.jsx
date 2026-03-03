"use client";

import React from "react";
import Card from "@/components/ui/Card";
import ResetPassword from "@/components/partials/auth/Admin/resetPassword";

export default function page() {
  return (
    <>
    <div className="">
      <div className="lg-inner-column">
        <div className="right-column relative w-full">
          <Card
            title={"Admin Reset Password"}
            className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
          >
            <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-5">
              <ResetPassword />
            </div>
          </Card>
        </div>
      </div>
    </div>
  </>
  )
}
