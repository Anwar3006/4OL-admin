"use client";

import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import Card from "@/components/ui/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Image from "next/image";

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
      console.log("PILL DETAILS==>", data);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white shadow-md p-6 rounded-lg">
          {/* Color Swatch */}
          <div>
            <div className="text-sm font-medium mb-1">Color</div>
            <div
              className="w-10 h-10 rounded border border-gray-300"
              style={{ backgroundColor: data.color }}
            />
          </div>

          {/* Image */}
          <div>
            <div className="text-sm font-medium mb-1">Image</div>
            <img
              src={data.imageUrl}
              alt="Medication"
              width={100}
              height={100}
              className="rounded object-cover"
            />
          </div>

          {/* Notification Schedule */}
          <div>
            <div className="text-sm font-medium mb-1">
              Notification Schedule
            </div>
            <div className="text-gray-700">{data.reminder_type}</div>
          </div>

          {/* Start Date */}
          <div>
            <div className="text-sm font-medium mb-1">Start Date</div>
            <div className="text-gray-700">{data.start_date}</div>
          </div>

          {/* End Date */}
          <div>
            <div className="text-sm font-medium mb-1">End Date</div>
            <div className="text-gray-700">{data.end_date}</div>
          </div>

          {/* Amount */}
          <div>
            <div className="text-sm font-medium mb-1">Amount</div>
            <div className="text-gray-700">{data.medication_amount}</div>
          </div>

          {/* Dose Number of Times */}
          <div>
            <div className="text-sm font-medium mb-1">Dose</div>
            <div className="text-gray-700">{data.medication_dose}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default viewPilldetails;
