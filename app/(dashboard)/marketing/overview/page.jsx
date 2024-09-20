"use client";

import React, { useState } from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import Performance from "@/components/partials/auth/Marketing_Overview/performance";
import Activity from "@/components/partials/auth/Marketing_Overview/activity";

export default function Page() {
  const [isDark] = useDarkmode();
  const [isSelected, setIsSelected] = useState('activity'); // Default tab is 'activity'

  const handleTabClick = (tab) => {
    setIsSelected(tab); // Update the selected tab based on user click
  };

  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <Card
              title={"Overview"}
              className="inner-content w-full flex flex-col bg-white dark:bg-slate-800"
            >
              <div className="w-full flex flex-col justify-center">
                
                {/* Tab Buttons */}
                <div className="flex mb-4 rounded-sm sm:text-base text-sm font-semibold">
                  <button
                    className={`px-4 sm:py-2 py-1  ${isSelected === 'activity' ? 'bg-[#56ce84] text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
                    onClick={() => handleTabClick('activity')}
                  >
                    ACTIVITY
                  </button>
                  <button
                    className={`px-4 sm:py-2 py-1  ${isSelected === 'performance' ? 'bg-[#56ce84] text-white' : 'bg-gray-200 dark:bg-slate-700'}`}
                    onClick={() => handleTabClick('performance')}
                  >
                    PERFORMANCE
                  </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                  {isSelected === 'activity' && (
                    <div>
                      <Activity />
                    </div>
                  )}
                  {isSelected === 'performance' && (
                    <div>
                    <Performance />
                    </div>
                  )}
                </div>

              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
