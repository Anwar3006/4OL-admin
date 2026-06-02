"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
// import HealthyLiving from "@/components/redesign/auth/Categories/healthy_living";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <Card
        title={"Healthy Living"}
        className="inner-content w-full flex flex-col bg-white dark:bg-slate-800 mt-5"
      >
        <div className=" lg:w-[80%] w-full flex flex-col justify-center sm:p-2">
          {/* <HealthyLiving /> */}
        </div>
      </Card>
    </>
  );
}
