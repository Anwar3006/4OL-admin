"use client";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import GroupChart1 from "@/components/partials/widget/chart/group-chart-1";
import GroupChart4 from "@/components/partials/widget/chart/group-chart-4";
import ColumnChart from "@/components/partials/chart/appex-chart/HorizontalBar";
import Pie from "@/components/partials/chart/appex-chart/Pie";
import { fetchDashboardOverviewStats } from "@/app/services/dashboard";
import DauChart from "@/components/partials/chart/appex-chart/DauChart";

const TotalsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboardOverviewStats(
      () => setLoading(true),
      (successData) => {
        setData(successData);
        setLoading(false);
      },
      (error) => {
        console.log("Error fetching dashboard stats", error);
        setLoading(false);
      }
    );
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const { live, dau_trends, mau_trends, download_trends } = data;

  return (
    <div>
      <div className="grid grid-cols-12 gap-5 mb-5">
        <div className="2xl:col-span-12 lg:col-span-12 col-span-12">
          <Card title="Dashboard Totals" bodyClass="p-4" titleClass="text-2xl font-bold">
            <div className="grid md:grid-cols-4 col-span-1 gap-4">
              <GroupChart1
                totalDownloads={live.total_downloads}
                totalUsers={live.total_users}
                totalFacilities={live.total_facilities}
                totalSpecialists={live.total_specialists}
                loadingTotalDownloads={false}
                loadingTotalUsers={false}
                loadingTotalFacilities={false}
                loadingTotalSpecialists={false}
              />
            </div>
            <div className="grid md:grid-cols-4 col-span-1 gap-4 pt-4">
              <GroupChart4
                totalOnlineUsers={live.total_online_users}
                totalMedicationReminderUsers={live.total_medication_reminder_users}
                totalPeriodTrackerUsers={live.total_period_tracker_users}
                totalWorkoutReminderUsers={live.total_workout_reminder_users || 0}
                loadingOnlineUsers={false}
                loadingMedicationReminderUsers={false}
                loadingPeriodTrackerUsers={false}
                loadingWorkoutReminderUsers={false}
              />
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-12 gap-5">
        <div className="lg:col-span-8 col-span-12">
          <Card title={"Monthly Downloads"} className="h-full">
            <div className="legend-ring">
              <ColumnChart data={download_trends} type={"downloads"} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 col-span-12 flex flex-col bg-white shadow-base rounded-lg h-full">
          <Card title="Total Users" className="h-full">
            <div className="flex-grow">
              <Pie totalUsers={{ males: live.males_count, females: live.females_count }} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 mt-5">
        <div className="lg:col-span-6 col-span-12">
          <Card title={"Daily Active Users (DAU)"}>
            <div className="legend-ring">
              <DauChart data={dau_trends} />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-6 col-span-12 flex flex-col bg-white shadow-base rounded-lg">
          <Card title={"Monthly Active Users (MAU)"}>
            <div className="legend-ring">
              <ColumnChart data={mau_trends} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TotalsDashboard;
