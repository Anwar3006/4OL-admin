"use client";

import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import Card from "@/components/ui/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

const viewPilldetails = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();

  const fetchPilReminders = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from("medication_reminders")
        .select("*, user_profiles (first_name, last_name)")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching pills details", error);
      }

      setData(data || []);
    } catch (error) {
      console.error("Error fetching pills details", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilReminders();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Pills Details</h1>
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          iconClass="text-lg"
          onClick={() => router.back()}
        />
      </div>
      {data && (
        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-[1fr_2fr] md:gap-6">
            {/* Key-Value Pairs */}
            <div className="text-lg text-black-500 whitespace-nowrap">
              Full Name
            </div>
            <div className="text-base text-gray-700">
              {data.user_profiles.first_name} {data.user_profiles.last_name}
            </div>

            <div className="text-lg text-black-500 break-words min-w-[120px]">
              Medication Name
            </div>
            <div className="text-base text-gray-700 break-words">
              {data.medication_name}
            </div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              Condition
            </div>
            <div className="text-base text-gray-700">{data.condition}</div>

            <div className="text-lg text-black-500 break-words min-w-[120px]">
              Medication Type
            </div>
            <div className="text-base text-gray-700 break-words">
              {data.medication_type}
            </div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              Color
            </div>
            <div
              className="w-10 h-10 rounded border border-gray-200"
              style={{ backgroundColor: data.color }}
            />

            <div className="text-lg text-black-500 whitespace-nowrap">
              Image
            </div>
            <div className="flex items-center">
              <img
                src={data.imageUrl}
                alt="Medication"
                className="rounded-lg object-contain w-24 h-24 border border-gray-200"
              />
            </div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              Start Date
            </div>
            <div className="text-gray-700">{data.start_date.slice(0, 10)}</div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              End Date
            </div>
            <div className="text-gray-700">{data.end_date.slice(0, 10)}</div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              Amount
            </div>
            <div className="text-gray-700">{data.medication_amount}</div>

            <div className="text-lg text-black-500 whitespace-nowrap">Dose</div>
            <div className="text-gray-700">{data.medication_dose}</div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              No. of times
            </div>
            <div className="text-gray-700">{data.intake_amount}</div>

            <div className="text-lg text-black-500 whitespace-nowrap">
              Notification Schedule
            </div>
            {/* <div className="">
              {Array.isArray(data.reminder_timestamps) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-2 gap-4">
                  {data.reminder_timestamps.map((ts, index) => {
                    const date = new Date(ts);
                    const formatted = date
                      .toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                      .replace(",", "");
                    return (
                      <div key={index} className="text-sm p-2">
                        {formatted}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-gray-500">No reminders scheduled</div>
              )}
            </div> */}
          </div>

          {/* Notification Schedule Grid */}
          <div className="text-gray-700 mt-3">
            {Array.isArray(data.reminder_timestamps) ? (
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-2">
                {data.reminder_timestamps.map((ts, index) => {
                  const date = new Date(ts);
                  const formatted = date
                    .toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                    .replace(",", "");
                  return (
                    <div key={index} className="text-sm">
                      {formatted}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>No Reminders Found</div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default viewPilldetails;
