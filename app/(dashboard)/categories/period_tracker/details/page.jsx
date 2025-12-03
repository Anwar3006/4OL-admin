"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loading from "@/components/Loading";
import moment from "moment";
import { Icon } from "@iconify/react";

const PeriodTrackerDetails = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLog();
    }
  }, [id]);

  const fetchLog = async () => {
    try {
      const { data, error } = await supabase
        .from("period_tracker")
        .select("*, user_profiles (*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      setLog(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching period tracker log:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!log) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Period tracker log not found</p>
        <Button
          text="Back to Overview"
          onClick={() => router.push("/categories/period_tracker/overview")}
          className="mt-4"
        />
      </div>
    );
  }

  return (
    <div className="mt-5">
      <Card
        title="Period Tracker Details"
        className="overflow-hidden"
        bodyClass="p-6"
        headerslot={
          <Button
            text="Back to Overview"
            icon="heroicons-outline:arrow-left"
            className="btn-dark btn-sm"
            onClick={() => router.push("/categories/period_tracker/overview")}
          />
        }
      >
        <div className="space-y-6">
          {/* User Information */}
          <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4">
              User Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Full Name</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.user_profiles?.first_name} {log.user_profiles?.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.user_profiles?.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Phone</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.user_profiles?.phone_number || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Region</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.user_profiles?.region || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Period Tracker Information */}
          <div className="bg-gray-50 dark:bg-slate-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4">
              Period Tracker Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Goal</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.goal || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Cycle Length</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.cycle_length} days
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Period Length</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.period_length} days
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Is Consistent?</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {log.is_consistent || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Period Start Date</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {moment(log.period_start_date).format("MMM DD, YYYY")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Next Reminder</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {moment(log.next_reminder).format("MMM DD, YYYY")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Ovulation Date</p>
                <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                  {moment(log.ovulation_date).format("MMM DD, YYYY")}
                </p>
              </div>
            </div>
          </div>

          {/* Fertile Window */}
          {log.fertile_window && log.fertile_window.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Icon icon="healthicons:sexual-reproductive-health" className="text-purple-600" width={24} />
                Fertile Window
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {log.fertile_window.map((date, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm">
                    <p className="text-gray-700 dark:text-slate-300">
                      {moment(date).format("MMM DD, YYYY")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flow Types */}
          {log.flow_types && log.flow_types.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Icon icon="bi:droplet-fill" className="text-red-600" width={24} />
                Flow Types
              </h3>
              <div className="space-y-3">
                {log.flow_types.map((flow, index) => (
                  <div key={index} className="bg-white dark:bg-slate-800 p-4 rounded shadow-sm">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Date</p>
                        <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                          {moment(flow.date).format("MMM DD, YYYY")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Flow Type</p>
                        <p className="text-base font-medium text-gray-900 dark:text-slate-200">
                          {flow.flow_type}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PeriodTrackerDetails;

