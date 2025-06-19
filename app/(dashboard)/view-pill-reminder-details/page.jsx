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
    <Card className="min-h-[80vh] bg-white mt-8">
      <div className="flex justify-between items-center mb-4">
        <h6 className="md:mb-0 mb-0 w-full">Pills Reminder</h6>
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          iconClass="text-lg"
          onClick={() => router.back()}
        />
      </div>
      {data && (
        <div className=" bg-white flex justify-between lg:w-[50%] md:w-[80%] w-full">
          <div className="grid grid-cols-2 gap-x-2 md:grid-cols-[minmax(100px,max-content)_1fr] md:gap-x-3 gap-y-2 text-sm">
            {/* Key-Value Pairs */}
            <div className=" text-black-500 whitespace-nowrap">Full Name</div>
            <div className=" text-gray-700">
              {data.user_profiles.first_name} {data.user_profiles.last_name}
            </div>

            <div className=" text-black-500 break-words min-w-[120px]">
              Medication Name
            </div>
            <div className=" text-gray-700 break-words">
              {data.medication_name}
            </div>

            <div className=" text-black-500 whitespace-nowrap">Condition</div>
            <div className=" text-gray-700">{data.condition}</div>

            <div className=" text-black-500 break-words min-w-[120px]">
              Medication Type
            </div>
            <div className=" text-gray-700 break-words">
              {data.medication_type}
            </div>

            <div className=" text-black-500 whitespace-nowrap">Color</div>
            <div
              className="w-10 h-10 rounded border border-gray-200"
              style={{ backgroundColor: data.color }}
            />

            <div className=" text-black-500 whitespace-nowrap">Image</div>
            <div className="flex items-center">
              <img
                src={data.imageUrl}
                alt="Medication"
                className="rounded-md object-cover w-24 h-24"
              />
            </div>

            <div className=" text-black-500 whitespace-nowrap">Start Date</div>
            <div className="text-gray-700">{data.start_date.slice(0, 10)}</div>

            <div className=" text-black-500 whitespace-nowrap">End Date</div>
            <div className="text-gray-700">{data.end_date.slice(0, 10)}</div>

            <div className=" text-black-500 whitespace-nowrap">Amount</div>
            <div className="text-gray-700">{data.medication_amount}</div>

            <div className=" text-black-500 whitespace-nowrap">Dose</div>
            <div className="text-gray-700">{data.medication_dose}</div>

            <div className=" text-black-500 whitespace-nowrap">
              No. of times
            </div>
            <div className="text-gray-700">{data.intake_amount}</div>
          </div>

          <div className=" md:gap-x-3 gap-y-2 text-sm">
            <div className=" text-black-500 font-bold font-base mb-2 whitespace-nowrap">
              Notification Schedule
            </div>
            <div className=" flex gap-x-2 text-gray-700">
              {Array.isArray(data.reminder_timestamps) ? (
                // Create 3 columns from the timestamps
                [0, 1].map((colIndex) => (
                  <div
                    key={colIndex}
                    className="flex flex-col space-y-1 text-sm"
                  >
                    {data.reminder_timestamps
                      .filter((_, i) => i % 3 === colIndex)
                      .map((ts, index) => {
                        const date = new Date(ts);
                        const formatted = date
                          .toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                          .replace(",", "");
                        return (
                          <div
                            key={index}
                            className="whitespace-nowrap truncate"
                          >
                            {formatted}
                          </div>
                        );
                      })}
                  </div>
                ))
              ) : (
                <div>No Reminders Found</div>
              )}
            </div>
          </div>
          {/* Notification Schedule Grid */}
          {/* <div className="mt-4 flex gap-x-2 text-gray-700">
            {Array.isArray(data.reminder_timestamps) ? (
              // Create 3 columns from the timestamps
              [0, 1].map((colIndex) => (
                <div key={colIndex} className="flex flex-col space-y-1 text-sm">
                  {data.reminder_timestamps
                    .filter((_, i) => i % 3 === colIndex)
                    .map((ts, index) => {
                      const date = new Date(ts);
                      const formatted = date
                        .toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                        .replace(",", "");
                      return (
                        <div key={index} className="whitespace-nowrap truncate">
                          {formatted}
                        </div>
                      );
                    })}
                </div>
              ))
            ) : (
              <div>No Reminders Found</div>
            )}
          </div> */}
        </div>
      )}
    </Card>
  );
};

export default viewPilldetails;
