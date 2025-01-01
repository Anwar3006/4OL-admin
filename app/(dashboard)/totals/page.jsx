"use client";
import dynamic from "next/dynamic";
import React, { useState } from "react";
import Card from "@/components/ui/Card";
import ImageBlock1 from "@/components/partials/widget/block/image-block-1";
import GroupChart1 from "@/components/partials/widget/chart/group-chart-1";
import RevenueBarChart from "@/components/partials/widget/chart/revenue-bar-chart";
import RadialsChart from "@/components/partials/widget/chart/radials";
import SelectMonth from "@/components/partials/SelectMonth";
import CompanyTable from "@/components/partials/table/company-table";
import RecentActivity from "@/components/partials/widget/recent-activity";
import RadarChart from "@/components/partials/widget/chart/radar-chart";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import LineChart from "@/components/partials/chart/chartjs/LineChart";
import GroupChart2 from "@/components/partials/widget/chart/group-chart-2";
import GroupChart3 from "@/components/partials/widget/chart/group-chart-3";
import GroupChart4 from "@/components/partials/widget/chart/group-chart-4";
import GroupChart5 from "@/components/partials/widget/chart/group-chart5";
import ColumnChart from "@/components/partials/chart/appex-chart/HorizontalBar";
import Pie from "@/components/partials/chart/appex-chart/Pie";

const MostSales = dynamic(
  () => import("@/components/partials/widget/most-sales"),
  {
    ssr: false,
  }
);
const TotalsDashboard = () => {
  const [filterMap, setFilterMap] = useState("usa");
  return (
    <div>
      {/* <HomeBredCurbs title="Analytics & Monitoring" /> */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {/* <div className="2xl:col-span-3 lg:col-span-4 col-span-12">
            <ImageBlock1 />
          </div> */}
        <div className="2xl:col-span-12 lg:col-span-12 col-span-12">
          <Card bodyClass="p-4">
            <div className="grid md:grid-cols-5 col-span-1 gap-4">
              <GroupChart1 />
            </div>
            <div className="grid md:grid-cols-3 col-span-1 gap-4 pt-4">
              <GroupChart4 />
            </div>
          </Card>
        </div>
      </div>
        <div className="grid grid-cols-12 gap-5">
          <div className="lg:col-span-8 col-span-12">
            {/* new users chart */}
            <Card title={"New Users"} headerslot={<SelectMonth />}>
              <p className="text-right sm:text-sm text-xs text-blue-500">14.21% high than last month</p>
              <div className="legend-ring">
                <ColumnChart />
              </div>

              {/* overall */}
              <div className="flex justify-between items-center text-center w-full text-sm lg:p-5 p-2 ">
                <div>
                  <h6 className="text-sm font-semibold">Overall</h6>
                  <p className="text-xs">78.51%</p>
                </div>
                <div>
                  <h6 className="text-sm font-semibold">Monthly</h6>
                  <p className="text-xs">18.51%</p>
                </div>
                <div>
                  <h6 className="text-sm font-semibold">Daily</h6>
                  <p className="text-xs">63.51%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* total users chart */}
          <div className="lg:col-span-4 col-span-12 flex flex-col bg-white shadow-base rounded-lg">
            <Card
              title="Total Users"
              headerslot={<SelectMonth />}
            >
              <div className="flex-grow">
                <Pie />
              </div>
            </Card>
          </div>
        </div>

        {/* active users chart */}
      <div className="grid grid-cols-12 gap-5">
        <div className=" col-span-12 pt-5">
        <Card title={"Active Users"} headerslot={<SelectMonth />}>
              <p className="text-right sm:text-sm text-xs text-blue-500">14.21% high than last month</p>
              <div className="legend-ring">
                <ColumnChart />
              </div>

              {/* overall */}
              <div className="flex justify-between items-center text-center w-full text-sm lg:p-5 p-2 ">
                <div>
                  <h6 className="text-sm font-semibold">Overall</h6>
                  <p className="text-xs">78.51%</p>
                </div>
                <div>
                  <h6 className="text-sm font-semibold">Monthly</h6>
                  <p className="text-xs">18.51%</p>
                </div>
                <div>
                  <h6 className="text-sm font-semibold">Daily</h6>
                  <p className="text-xs">63.51%</p>
                </div>
              </div>
            </Card>
        </div>
        {/* <div className="lg:col-span-4 col-span-12">
          <Card title="Recent Activity" headerslot={<SelectMonth />}>
            <RecentActivity />
          </Card>
        </div> */}
        {/* <div className="lg:col-span-8 col-span-12">
          <Card
            title="Most Sales"
            headerslot={
              <div className="border border-slate-200 dark:border-slate-700 dark:bg-slate-900 rounded p-1 flex items-center">
                <span
                  className={` flex-1 text-sm font-normal px-3 py-1 transition-all duration-150 rounded cursor-pointer
                ${
                  filterMap === "global"
                    ? "bg-[#56ce84] text-white dark:bg-slate-700 dark:text-slate-300"
                    : "dark:text-slate-300"
                }  
                `}
                  onClick={() => setFilterMap("global")}
                >
                  Global
                </span>
                <span
                  className={` flex-1 text-sm font-normal px-3 py-1 rounded transition-all duration-150 cursor-pointer
                  ${
                    filterMap === "usa"
                      ? "bg-[#56ce84] text-white dark:bg-slate-700 dark:text-slate-300"
                      : "dark:text-slate-300"
                  }
              `}
                  onClick={() => setFilterMap("usa")}
                >
                  USA
                </span>
              </div>
            }
          >
            <MostSales filterMap={filterMap} />
          </Card>
        </div>
        <div className="lg:col-span-4 col-span-12">
          <Card title="Overview" headerslot={<SelectMonth />}>
            <RadarChart />
            <div className="bg-slate-50 dark:bg-slate-900 rounded p-4 mt-8 flex justify-between flex-wrap">
              <div className="space-y-1">
                <h4 className="text-slate-600 dark:text-slate-200 text-xs font-normal">
                  Invested amount
                </h4>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  $8264.35
                </div>
                <div className="text-slate-500 dark:text-slate-300 text-xs font-normal">
                  +0.001.23 (0.2%)
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-slate-600 dark:text-slate-200 text-xs font-normal">
                  Invested amount
                </h4>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  $8264.35
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-slate-600 dark:text-slate-200 text-xs font-normal">
                  Invested amount
                </h4>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  $8264.35
                </div>
              </div>
            </div>
          </Card>
        </div> */}
      </div>
    </div>
  );
};

export default TotalsDashboard;
