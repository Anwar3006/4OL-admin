"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import AddPharmacyForm from "@/components/partials/auth/Facilities/Pharmacies/AddPharmacyForm";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Add Facility"}
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-5">
                <AddPharmacyForm />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
