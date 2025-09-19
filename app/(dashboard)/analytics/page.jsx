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
import TimePeriodFilter from "@/components/partials/TimePeriodFilter";
import {
  fetchAllDownloadsCount,
  fetchTotalUsers,
  fetchTotalFacilities,
  fetchTotalSpecialists,
  fetchTotalDiseasesAndConditions,
  fetchTotalSymptoms,
  fetchTotalHealthyLiving,
  fetchTotalOnlineUsers,
  fetchTotalMedicationReminderUsers,
  fetchTotalPeriodTrackerUsers,
  fetchTotalMarketing,
  fetchDownloadsCountByPeriod,
  fetchUsersCountByPeriod,
  fetchFacilitiesCountByPeriod,
  fetchSpecialistsCountByPeriod,
  fetchDiseasesCountByPeriod,
  fetchSymptomsCountByPeriod,
  fetchHealthyLivingCountByPeriod,
  fetchOnlineUsersCountByPeriod,
  fetchMedicationReminderUsersCountByPeriod,
  fetchPeriodTrackerUsersCountByPeriod,
} from "@/app/services/dashboard";

const MostSales = dynamic(
  () => import("@/components/partials/widget/most-sales"),
  {
    ssr: false,
  }
);
const Dashboard = () => {
  const [filterMap, setFilterMap] = useState("usa");
  const [selectedPeriod, setSelectedPeriod] = useState("weekly");
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

    // New state variables for user metrics (online users, medication reminders, period tracker)
    const [loadingTotalOnlineUsers, setLoadingTotalOnlineUsers] = useState(false);
    const [totalOnlineUsers, setTotalOnlineUsers] = useState(null);
    const [loadingTotalMedicationReminderUsers, setLoadingTotalMedicationReminderUsers] = useState(false);
    const [totalMedicationReminderUsers, setTotalMedicationReminderUsers] = useState(null);
    const [loadingTotalPeriodTrackerUsers, setLoadingTotalPeriodTrackerUsers] = useState(false);
    const [totalPeriodTrackerUsers, setTotalPeriodTrackerUsers] = useState(null);

    // New state variables for marketing
    const [loadingTotalMarketing, setLoadingTotalMarketing] = useState(false);
    const [totalMarketing, setTotalMarketing] = useState(null);

  // Function to fetch data based on selected period
  const fetchDataByPeriod = (period) => {
    if (period === "all") {
      // Fetch all-time data using original functions
      fetchAllDownloadsCount(
        () => setLoadingTotalDownloads(true),
        (data) => {
          setTotalDownloads(data);
          setLoadingTotalDownloads(false);
        },
        (error) => {
          console.log("Error fetching all downloads count", error);
          setLoadingTotalDownloads(false);
        }
      );

      fetchTotalUsers(
        () => setLoadingTotalUsers(true),
        (data) => {
          setTotalUsers(data);
          setLoadingTotalUsers(false);
        },
        (error) => {
          console.log("Error fetching all users count", error);
          setLoadingTotalUsers(false);
        }
      );

      fetchTotalFacilities(
        () => setLoadingTotalFacilities(true),
        (data) => {
          setTotalFacilities(data);
          setLoadingTotalFacilities(false);
        },
        (error) => {
          console.log("Error fetching all facilities count", error);
          setLoadingTotalFacilities(false);
        }
      );

      fetchTotalSpecialists(
        () => setLoadingTotalSpecialists(true),
        (data) => {
          setTotalSpecialists(data);
          setLoadingTotalSpecialists(false);
        },
        (error) => {
          console.log("Error fetching all specialists count", error);
          setLoadingTotalSpecialists(false);
        }
      );

      fetchTotalDiseasesAndConditions(
        () => setLoadingTotalDiseases(true),
        (data) => {
          setTotalDiseases(data);
          setLoadingTotalDiseases(false);
        },
        (error) => {
          console.log("Error fetching all diseases count", error);
          setLoadingTotalDiseases(false);
        }
      );

      fetchTotalSymptoms(
        () => setLoadingTotalSymptoms(true),
        (data) => {
          setTotalSymptoms(data);
          setLoadingTotalSymptoms(false);
        },
        (error) => {
          console.log("Error fetching all symptoms count", error);
          setLoadingTotalSymptoms(false);
        }
      );

      fetchTotalHealthyLiving(
        () => setLoadingTotalHealthyLiving(true),
        (data) => {
          setTotalHealthyLiving(data);
          setLoadingTotalHealthyLiving(false);
        },
        (error) => {
          console.log("Error fetching all healthy living count", error);
          setLoadingTotalHealthyLiving(false);
        }
      );

      // Fetch user metrics (all-time)
      fetchTotalOnlineUsers(
        () => setLoadingTotalOnlineUsers(true),
        (data) => {
          setTotalOnlineUsers(data);
          setLoadingTotalOnlineUsers(false);
        },
        (error) => {
          console.log("Error fetching all online users count", error);
          setLoadingTotalOnlineUsers(false);
        }
      );

      fetchTotalMedicationReminderUsers(
        () => setLoadingTotalMedicationReminderUsers(true),
        (data) => {
          setTotalMedicationReminderUsers(data);
          setLoadingTotalMedicationReminderUsers(false);
        },
        (error) => {
          console.log("Error fetching all medication reminder users count", error);
          setLoadingTotalMedicationReminderUsers(false);
        }
      );

      fetchTotalPeriodTrackerUsers(
        () => setLoadingTotalPeriodTrackerUsers(true),
        (data) => {
          setTotalPeriodTrackerUsers(data);
          setLoadingTotalPeriodTrackerUsers(false);
        },
        (error) => {
          console.log("Error fetching all period tracker users count", error);
          setLoadingTotalPeriodTrackerUsers(false);
        }
      );

      // Fetch marketing data (all-time)
      fetchTotalMarketing(
        () => setLoadingTotalMarketing(true),
        (data) => {
          setTotalMarketing(data);
          setLoadingTotalMarketing(false);
        },
        (error) => {
          console.log("Error fetching all marketing count", error);
          setLoadingTotalMarketing(false);
        }
      );
    } else {
      // Fetch period-specific data
      fetchDownloadsCountByPeriod(
        period,
        () => setLoadingTotalDownloads(true),
        (data) => {
          setTotalDownloads(data);
          setLoadingTotalDownloads(false);
        },
        (error) => {
          console.log("Error fetching downloads count by period", error);
          setLoadingTotalDownloads(false);
        }
      );

      fetchUsersCountByPeriod(
        period,
        () => setLoadingTotalUsers(true),
        (data) => {
          setTotalUsers(data);
          setLoadingTotalUsers(false);
        },
        (error) => {
          console.log("Error fetching users count by period", error);
          setLoadingTotalUsers(false);
        }
      );

      fetchFacilitiesCountByPeriod(
        period,
        () => setLoadingTotalFacilities(true),
        (data) => {
          setTotalFacilities(data);
          setLoadingTotalFacilities(false);
        },
        (error) => {
          console.log("Error fetching facilities count by period", error);
          setLoadingTotalFacilities(false);
        }
      );

      fetchSpecialistsCountByPeriod(
        period,
        () => setLoadingTotalSpecialists(true),
        (data) => {
          setTotalSpecialists(data);
          setLoadingTotalSpecialists(false);
        },
        (error) => {
          console.log("Error fetching specialists count by period", error);
          setLoadingTotalSpecialists(false);
        }
      );

      fetchDiseasesCountByPeriod(
        period,
        () => setLoadingTotalDiseases(true),
        (data) => {
          setTotalDiseases(data);
          setLoadingTotalDiseases(false);
        },
        (error) => {
          console.log("Error fetching diseases count by period", error);
          setLoadingTotalDiseases(false);
        }
      );

      fetchSymptomsCountByPeriod(
        period,
        () => setLoadingTotalSymptoms(true),
        (data) => {
          setTotalSymptoms(data);
          setLoadingTotalSymptoms(false);
        },
        (error) => {
          console.log("Error fetching symptoms count by period", error);
          setLoadingTotalSymptoms(false);
        }
      );

      fetchHealthyLivingCountByPeriod(
        period,
        () => setLoadingTotalHealthyLiving(true),
        (data) => {
          setTotalHealthyLiving(data);
          setLoadingTotalHealthyLiving(false);
        },
        (error) => {
          console.log("Error fetching healthy living count by period", error);
          setLoadingTotalHealthyLiving(false);
        }
      );

      // Fetch user metrics by period
      fetchOnlineUsersCountByPeriod(
        period,
        () => setLoadingTotalOnlineUsers(true),
        (data) => {
          setTotalOnlineUsers(data);
          setLoadingTotalOnlineUsers(false);
        },
        (error) => {
          console.log("Error fetching online users count by period", error);
          setLoadingTotalOnlineUsers(false);
        }
      );

      fetchMedicationReminderUsersCountByPeriod(
        period,
        () => setLoadingTotalMedicationReminderUsers(true),
        (data) => {
          setTotalMedicationReminderUsers(data);
          setLoadingTotalMedicationReminderUsers(false);
        },
        (error) => {
          console.log("Error fetching medication reminder users count by period", error);
          setLoadingTotalMedicationReminderUsers(false);
        }
      );

      fetchPeriodTrackerUsersCountByPeriod(
        period,
        () => setLoadingTotalPeriodTrackerUsers(true),
        (data) => {
          setTotalPeriodTrackerUsers(data);
          setLoadingTotalPeriodTrackerUsers(false);
        },
        (error) => {
          console.log("Error fetching period tracker users count by period", error);
          setLoadingTotalPeriodTrackerUsers(false);
        }
      );
    }
  };

  // Handle period change
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchDataByPeriod(period);
  };

  useEffect(() => {
    // Fetch initial data based on selected period
    fetchDataByPeriod(selectedPeriod);
  }, []);

  // Fetch data when period changes
  useEffect(() => {
    fetchDataByPeriod(selectedPeriod);
  }, [selectedPeriod]);

  console.log("total users", totalUsers)
  return (
    <div>
      {/* <HomeBredCurbs title="Analytics & Monitoring" /> */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {/* <div className="2xl:col-span-3 lg:col-span-4 col-span-12">
            <ImageBlock1 />
          </div> */}
        <div className="2xl:col-span-12 lg:col-span-12 col-span-12">
          <Card 
            title="Analytics Dashboard"
            headerslot={
              <TimePeriodFilter 
                selectedPeriod={selectedPeriod}
                onPeriodChange={handlePeriodChange}
                className="ml-auto max-sm:mt-2"
              />
            }
            bodyClass="p-4"
            headerClass="flex max-sm:flex-col sm:justify-between items-center"
          >
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
                <BarChart1 
                  totalOnlineUsers={totalOnlineUsers?.totalOnlineUsers || 0}
                  males={totalOnlineUsers?.males || 0}
                  females={totalOnlineUsers?.females || 0}
                  loading={loadingTotalOnlineUsers}
                />
              </Card>
              <Card
                className="legend-ring bg-warning-50 flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Meds Reminder Users"}
                titleClass="text-base"
              >
                <BarChart2 
                  totalMedicationReminderUsers={totalMedicationReminderUsers?.totalMedicationReminderUsers || 0}
                  males={totalMedicationReminderUsers?.males || 0}
                  females={totalMedicationReminderUsers?.females || 0}
                  loading={loadingTotalMedicationReminderUsers}
                />
              </Card>
              <Card
                className="legend-ring bg-yellow-50 flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Period Tracker Users"}
                titleClass="text-base"
              >
                <BarChart3 
                  totalPeriodTrackerUsers={totalPeriodTrackerUsers?.totalPeriodTrackerUsers || 0}
                  loading={loadingTotalPeriodTrackerUsers}
                />
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

            <div className="flex justify-center items-center pt-4">
              <Card
                className="w-full flex flex-col justify-center items-center"
                bodyClass={"p-0"}
                title={"Total Marketing"}
                titleClass="text-base"
              >
                <BarChart4 
                  health={totalMarketing?.health || 0}
                  ads={totalMarketing?.ads || 0}
                  event={totalMarketing?.event || 0}
                  news={totalMarketing?.news || 0}
                  marketing={totalMarketing?.marketing || 0}
                  loading={loadingTotalMarketing}
                />
              </Card>
              {/* <Card
                className="col-span-2 w-full flex flex-col justify-center items-center text-center"
                bodyClass={"p-0"}
                title={"Total Readers"}
                titleClass="text-base text-center"
              >
                <div className="w-full flex max-sm:flex-col justify-around ">
                  <BarChart5 />
                  <BarChart6 />
                </div>
              </Card> */}
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
