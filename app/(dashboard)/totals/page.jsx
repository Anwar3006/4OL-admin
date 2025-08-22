"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
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
import {
  fetchAllDownloadsCount,
  fetchDAULast12Months,
  fetchDownloadsLast12Months,
  fetchMAULast12Months,
  fetchTotalUsers,
  fetchTotalFacilities,
  fetchTotalSpecialists,
  fetchTotalFacilityVisits,
} from "@/app/services/dashboard";
import DauChart from "@/components/partials/chart/appex-chart/DauChart";

const MostSales = dynamic(
  () => import("@/components/partials/widget/most-sales"),
  {
    ssr: false,
  }
);
const TotalsDashboard = () => {
  const [filterMap, setFilterMap] = useState("usa");
  const [loadingDau, setLoadingDau] = useState(false);
  const [dauData, setDauData] = useState(null);
  const [dauGrowthRate, setDauGrowthRate] = useState(null);
  const [loadingMau, setLoadingMau] = useState(false);
  const [mauData, setMauData] = useState(null);
  const [mauGrowthRate, setMauGrowthRate] = useState(null);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [downloadsData, setDownloadsData] = useState(null);
  const [loadingTotalDownloads, setLoadingTotalDownloads] = useState(false);
  const [totalDownloads, setTotalDownloads] = useState(null);
  const [loadingTotalUsers, setLoadingTotalUsers] = useState(false);
  const [totalUsers, setTotalUsers] = useState(null);
  
  // New state variables for facilities, specialists, and facility visits
  const [loadingTotalFacilities, setLoadingTotalFacilities] = useState(false);
  const [totalFacilities, setTotalFacilities] = useState(null);
  const [loadingTotalSpecialists, setLoadingTotalSpecialists] = useState(false);
  const [totalSpecialists, setTotalSpecialists] = useState(null);

  useEffect(() => {
    fetchMAULast12Months(
      () => {
        setLoadingMau(true);
      },
      (successData) => {
        setMauData(successData);
        setLoadingMau(false);
      },
      (error) => {
        console.log("Error fetching MAU", error);
        setLoadingMau(false);
      }
    );
    fetchDAULast12Months(
      () => {
        setLoadingDau(true);
      },
      (successData) => {
        setDauData(successData);
        setLoadingDau(false);
      },
      (error) => {
        console.log("Error fetching DAU", error);
        setLoadingDau(false);
      }
    );
    fetchDownloadsLast12Months(
      () => {
        setLoadingDownloads(true);
      },
      (successData) => {
        setDownloadsData(successData);
        setLoadingDownloads(false);
      },
      (error) => {
        console.log("Error fetching Downloads", error);
        setLoadingDownloads(false);
      }
    );
    fetchAllDownloadsCount(
      () => {
        setLoadingTotalDownloads(true);
      },
      (successData) => {
        setTotalDownloads(successData);
        setLoadingTotalDownloads(false);
      },
      (error) => {
        console.log("Error fetching Downloads count", error);
        setLoadingTotalDownloads(false);
      }
    );
    fetchTotalUsers(
      () => {
        setLoadingTotalUsers(true);
      },
      (successData) => {
        setTotalUsers(successData);
        setLoadingTotalUsers(false);
      },
      (error) => {
        console.log("Error fetching users count", error);
        setLoadingTotalUsers(false);
      }
    );
    
    // Fetch total facilities
    fetchTotalFacilities(
      () => {
        setLoadingTotalFacilities(true);
      },
      (successData) => {
        setTotalFacilities(successData);
        setLoadingTotalFacilities(false);
      },
      (error) => {
        console.log("Error fetching facilities count", error);
        setLoadingTotalFacilities(false);
      }
    );
    
    // Fetch total specialists
    fetchTotalSpecialists(
      () => {
        setLoadingTotalSpecialists(true);
      },
      (successData) => {
        setTotalSpecialists(successData);
        setLoadingTotalSpecialists(false);
      },
      (error) => {
        console.log("Error fetching specialists count", error);
        setLoadingTotalSpecialists(false);
      }
    );
  }, []);

  return (
    <div>
      {/* <HomeBredCurbs title="Analytics & Monitoring" /> */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {/* <div className="2xl:col-span-3 lg:col-span-4 col-span-12">
            <ImageBlock1 />
          </div> */}
        <div className="2xl:col-span-12 lg:col-span-12 col-span-12">
          <Card bodyClass="p-4">
            <div className="grid md:grid-cols-4 col-span-1 gap-4">
              <GroupChart1
                totalDownloads={totalDownloads || 0}
                totalUsers={totalUsers?.totalUsers || 0}
                totalFacilities={totalFacilities?.totalFacilities || 0}
                totalSpecialists={totalSpecialists?.totalSpecialists || 0}
                loadingTotalDownloads={loadingTotalDownloads}
                loadingTotalUsers={loadingTotalUsers}
                loadingTotalFacilities={loadingTotalFacilities}
                loadingTotalSpecialists={loadingTotalSpecialists}
              />
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
          <Card title={"Monthly Downloads"}>
            {/* <p className="text-right sm:text-sm text-xs text-blue-500">
              {!mauGrowthRate
                ? "No Previous Record"
                : mauGrowthRate > 0
                ? `${mauGrowthRate}% higher than last month`
                : `${Math.abs(mauGrowthRate)}% lower than last month`}
            </p> */}
            <div className="legend-ring">
              <ColumnChart data={downloadsData} type={"downloads"} />
            </div>
          </Card>
        </div>

        {/* total users chart */}
        <div className="lg:col-span-4 col-span-12 flex flex-col bg-white shadow-base rounded-lg">
          <Card title="Total Users">
            <div className="flex-grow">
              <Pie totalUsers={totalUsers} />
            </div>
          </Card>
        </div>
      </div>

      {/* active users chart */}
      <div className="grid grid-cols-12 gap-5 mt-5">
        <div className="lg:col-span-6 col-span-12">
          <Card title={"Daily Active Users (DAU)"}>
            {/* <p className="text-right sm:text-sm text-xs text-blue-500">
              {!dauGrowthRate
                ? "No Previous Record"
                : dauGrowthRate > 0
                ? `${dauGrowthRate}% higher than last month`
                : `${Math.abs(dauGrowthRate)}% lower than last month`}
            </p> */}
            <div className="legend-ring">
              <DauChart data={dauData} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 col-span-12 flex flex-col bg-white shadow-base rounded-lg">
          <Card title={"Monthly Active Users (MAU)"}>
            {/* <p className="text-right sm:text-sm text-xs text-blue-500">
              {!mauGrowthRate
                ? "No Previous Record"
                : mauGrowthRate > 0
                ? `${mauGrowthRate}% higher than last month`
                : `${Math.abs(mauGrowthRate)}% lower than last month`}
            </p> */}
            <div className="legend-ring">
              <ColumnChart data={mauData} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TotalsDashboard;
