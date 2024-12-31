"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import SymptomsForm from "@/components/partials/auth/Categories/symptoms_form";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Symptoms Form"}
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-5">
               <SymptomsForm/>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
