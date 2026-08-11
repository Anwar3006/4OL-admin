import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import HealthyLiving from "@/components/redesign/auth/Categories/healthy_living";

export default function page() {
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
