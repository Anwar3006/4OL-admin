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
import BarChart1 from "@/components/partials/chart/appex-chart/BarCharts/BarChart1";
import BarChart2 from "@/components/partials/chart/appex-chart/BarCharts/BarChart2";
import BarChart3 from "@/components/partials/chart/appex-chart/BarCharts/BarChart3";
import BarChart4 from "@/components/partials/chart/appex-chart/BarCharts/BarChart4";
import PercentBarChart from "@/components/partials/chart/appex-chart/BarCharts/BarChart5";
import BarChart5 from "@/components/partials/chart/appex-chart/BarCharts/BarChart5";
import BarChart6 from "@/components/partials/chart/appex-chart/BarCharts/BarChart6";
import {
  fetchAllDownloadsCount,
  fetchTotalUsers,
  fetchTotalFacilities,
  fetchTotalSpecialists,
  fetchTotalDiseasesAndConditions,
  fetchTotalSymptoms,
  fetchTotalHealthyLiving,
} from "@/app/services/dashboard";

const MostSales = dynamic(
  () => import("@/components/partials/widget/most-sales"),
  {
    ssr: false,
  }
);
const Dashboard = () => {
  const [filterMap, setFilterMap] = useState("usa");
  const [loadingTotalDownloads, setLoadingTotalDownloads] = useState(false);
  const [totalDownloads, setTotalDownloads] = useState(null);
  const [loadingTotalUsers, setLoadingTotalUsers] = useState(false);
  const [totalUsers, setTotalUsers] = useState(null);
    // New state variables for facilities, specialists, and facility visits
    const [loadingTotalFacilities, setLoadingTotalFacilities] = useState(false);
    const [totalFacilities, setTotalFacilities] = useState(null);
    const [loadingTotalSpecialists, setLoadingTotalSpecialists] = useState(false);
    const [totalSpecialists, setTotalSpecialists] = useState(null);
    
    // New state variables for diseases, symptoms, and healthy living
    const [loadingTotalDiseases, setLoadingTotalDiseases] = useState(false);
    const [totalDiseases, setTotalDiseases] = useState(null);
    const [loadingTotalSymptoms, setLoadingTotalSymptoms] = useState(false);
    const [totalSymptoms, setTotalSymptoms] = useState(null);
    const [loadingTotalHealthyLiving, setLoadingTotalHealthyLiving] = useState(false);
    const [totalHealthyLiving, setTotalHealthyLiving] = useState(null);

  useEffect(() => {
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

    // Fetch total diseases and conditions
    fetchTotalDiseasesAndConditions(
      () => {
        setLoadingTotalDiseases(true);
      },
      (successData) => {
        setTotalDiseases(successData);
        setLoadingTotalDiseases(false);
      },
      (error) => {
        console.log("Error fetching diseases count", error);
        setLoadingTotalDiseases(false);
      }
    );

    // Fetch total symptoms
    fetchTotalSymptoms(
      () => {
        setLoadingTotalSymptoms(true);
      },
      (successData) => {
        setTotalSymptoms(successData);
        setLoadingTotalSymptoms(false);
      },
      (error) => {
        console.log("Error fetching symptoms count", error);
        setLoadingTotalSymptoms(false);
      }
    );

    // Fetch total healthy living
    fetchTotalHealthyLiving(
      () => {
        setLoadingTotalHealthyLiving(true);
      },
      (successData) => {
        setTotalHealthyLiving(successData);
        setLoadingTotalHealthyLiving(false);
      },
      (error) => {
        console.log("Error fetching healthy living count", error);
        setLoadingTotalHealthyLiving(false);
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
            <div className="grid md:grid-cols-3 grid-cols-1 col-span-1 gap-4 pt-4 ">
              {/* <GroupChart4 /> */}
              <Card
                className="w-full text-center bg-success-50 flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Total Online Users"}
                titleClass="text-base"
              >
                <BarChart1 />
              </Card>
              <Card
                className="legend-ring bg-warning-50 flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Meds Reminder Users"}
                titleClass="text-base"
              >
                <BarChart2 />
              </Card>
              <Card
                className="legend-ring bg-yellow-50 flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Period Tracker Users"}
                titleClass="text-base"
              >
                <BarChart3 />
              </Card>
            </div>
            <div className="grid md:grid-cols-3 col-span-1 gap-4 pt-4">
              <GroupChart3 
                totalDiseasesAndConditions={totalDiseases?.totalDiseasesAndConditions || 0}
                totalSymptoms={totalSymptoms?.totalSymptoms || 0}
                totalHealthyLiving={totalHealthyLiving?.totalHealthyLiving || 0}
                loadingDiseases={loadingTotalDiseases}
                loadingSymptoms={loadingTotalSymptoms}
                loadingHealthyLiving={loadingTotalHealthyLiving}
              />
            </div>

            <div className="grid lg:grid-cols-3 grid-cols-1 col-span-1 gap-4 pt-4">
              <Card
                className="col-span-1 flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Total Marketing"}
                titleClass="text-base"
              >
                <BarChart4 />
              </Card>
              <Card
                className="col-span-2 w-full flex flex-col justify-center items-center text-center"
                bodyClass={"p-0"}
                title={"Total Readers"}
                titleClass="text-base text-center"
              >
                <div className="w-full flex max-sm:flex-col justify-around ">
                  <BarChart5 />
                  <BarChart6 />
                </div>
              </Card>
            </div>
          </Card>
        </div>
      </div>
      {/* <div className="grid grid-cols-12 gap-5">
          <div className="lg:col-span-8 col-span-12">
            new users chart
            <Card title={"New Users"} headerslot={<SelectMonth />}>
              <p className="text-right sm:text-sm text-xs text-blue-500">14.21% high than last month</p>
              <div className="legend-ring">
                <ColumnChart />
              </div>

              overall
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

          total users chart
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
        </div> */}

      {/* active users chart */}
      {/* <div className="grid grid-cols-12 gap-5">
        <div className=" col-span-12 pt-5">
        <Card title={"Active Users"} headerslot={<SelectMonth />}>
              <p className="text-right sm:text-sm text-xs text-blue-500">14.21% high than last month</p>
              <div className="legend-ring">
                <ColumnChart />
              </div>

              overall
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
      
      </div> */}
    </div>
  );
};

export default Dashboard;
