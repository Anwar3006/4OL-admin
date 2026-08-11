"use client";
import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const Notifications = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();

  useEffect(() => {
    const fetchNotification = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("notification_list")
        .select("title, description, region, sex, age_range")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching notification by id", error);
      }
      console.log("NOTIFICATIONS DATA", data);
      setData(data);
      setLoading(false);
    };
    fetchNotification();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  return (
    <Card className="min-h-[70vh] bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl font-bold">Notification Details</h1>
        <Button
          className="text-sm sm:text-base font-normal sm:mr-3 px-3 h-8"
          variant="default"
          onClick={() => router.back()}
        >
          <Icon icon="heroicons-outline:arrow-left" className="text-lg mr-2" />
          Back
        </Button>
      </div>

      {data && (
        <div className="p-6 bg-white">
          <div className="grid grid-cols-2 gap-x-2 md:grid-cols-[minmax(100px,max-content)_1fr] md:gap-x-3">
            <div className="text-black-500 text-lg">Title</div>
            <div className="text-base">{data.title}</div>

            <div className="text-black-500 text-lg">Description</div>
            <div className="text-base">{data.description}</div>

            <div className="text-black-500 text-lg">Region</div>
            <div className="text-base">{data.region}</div>

            <div className="text-black-500 text-lg">Sex</div>
            <div className="text-base">{data.sex}</div>

            <div className="text-black-500 text-lg">Age Range</div>
            <div className="text-base">{data.age_range}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Notifications;
