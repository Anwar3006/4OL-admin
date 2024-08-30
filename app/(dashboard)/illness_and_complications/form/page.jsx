"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import Illness_and_complication_form from "@/components/partials/auth/illness_and_complication_form";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Illness and Condition Form"}
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-5">
               <Illness_and_complication_form/>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
