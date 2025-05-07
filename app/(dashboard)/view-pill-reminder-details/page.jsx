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
        .select("*")
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
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 md:gap-6">
            {/* Color */}
            <div className="text-lg text-black-500">Color</div>
            <div
              className="w-10 h-10 rounded border border-gray-200"
              style={{ backgroundColor: data.color }}
            />

            {/* Image */}
            <div className="text-lg text-black-500">Image</div>
            <div className="flex items-center">
              <img
                src={data.imageUrl}
                alt="Medication"
                className="rounded-lg object-contain w-24 h-24 border border-gray-200"
              />
            </div>

            {/* Start Date */}
            <div className="text-lg text-black-500">Start Date</div>
            <div className="text-gray-700">{data.start_date.slice(0, 10)}</div>

            {/* End Date */}
            <div className="text-lg text-black-500">End Date</div>
            <div className="text-gray-700">{data.end_date.slice(0, 10)}</div>

            {/* Amount */}
            <div className="text-lg text-black-500">Amount</div>
            <div className="text-gray-700">{data.medication_amount}</div>

            {/* Dose */}
            <div className="text-lg text-black-500">Dose</div>
            <div className="text-gray-700">{data.medication_dose}</div>

            <div className="text-lg text-black-500">No. of times</div>
            <div className="text-gray-700">{data.intake_amount}</div>

            {/* Notification Schedule */}
            <div className="text-lg text-black-500">Notification Schedule</div>
          </div>
          <div className="text-gray-700 mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-1">
            {Array.isArray(data.reminder_timestamps)
              ? data.reminder_timestamps.map((ts, index) => {
                  const date = new Date(ts);
                  const formatted = date.toLocaleDateString("en-GB", {
                    month: "long",
                    day: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <div
                      key={index}
                      className="text-sm p-1 whitespace-nowrap truncate"
                    >
                      {formatted}
                    </div>
                  );
                })
              : "No Reminders Found"}
          </div>
        </div>
      )}
    </Card>
  );
};

export default viewPilldetails;
