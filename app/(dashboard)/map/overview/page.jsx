import React from "react";
import Card from "@/components/ui/Card";
import dynamic from "next/dynamic";

// Dynamically import the map to prevent SSR issues with window
const BasicMapRender = dynamic(
  () => import("@/components/partials/auth/map/BasicMapRender"),
  {
    ssr: false,
  }
);

export default function Page() {
  return (
    <div className="mt-5">
      <div className="lg-inner-column">
        <div className="right-column relative w-full">
          <Card
            title={"Map Overview"}
            bodyClass="max-sm:p-2 p-6 "
            className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
          >
            <div className="w-full flex flex-col justify-center">
              <BasicMapRender />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
