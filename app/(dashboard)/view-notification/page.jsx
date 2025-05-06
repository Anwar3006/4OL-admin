"use client";
import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
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
    <Card className="min-h-[80vh] bg-white">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2 sm:gap-0">
        <h1 className="text-xl font-bold">Notification Details</h1>
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark text-sm sm:text-base font-normal btn-sm sm:mr-3"
          iconClass="text-lg"
          onClick={() => router.back()}
        />
      </div>

      {data && (
        <div className="my-5 grid grid-cols-3 sm:grid-cols-2 gap-y-4 text-sm">
          <div className="font-semibold text-lg">Title:</div>
          <div className="text-base">{data.title}</div>

          <div className="font-semibold text-lg">Description:</div>
          <div className="text-base">{data.description}</div>

          <div className="font-semibold text-lg">Region:</div>
          <div className="text-base">{data.region}</div>

          <div className="font-semibold text-lg">Sex:</div>
          <div className="text-base">{data.sex}</div>

          <div className="font-semibold text-lg">Age Range:</div>
          <div className="text-base">{data.age_range}</div>
        </div>
      )}
    </Card>
  );
};

export default Notifications;
