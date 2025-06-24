"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import Illness_and_complication_form from "@/components/partials/auth/Categories/illness_and_complication_form";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <Card
        title={"Illness and Condition Form"}
        className="inner-content w-full flex flex-col bg-white dark:bg-slate-800 mt-5"
      >
        <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-2">
          <Illness_and_complication_form />
        </div>
      </Card>
    </>
  );
}
