"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import Button from "@/components/ui/Button";
import Loading from "@/components/Loading";

export default function ViewUserDetails() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  // Extract ID from query parameters
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching facility data:", error);
        setError(error.message);
      } else {
        setUserData(data);
      }
      setLoading(false);
    };

    fetchUser();
  }, [id]);

  if (loading)
    return (
      <div>
        <Loading />
      </div>
    );
  if (error) return <div>Error: {error}</div>;

  //   const handleEdit = (id) => {
  //     router.push(`/edit-facility-profile-form?id=${id}`);
  //   };

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold capitalize">
          {userData.first_name} {userData.last_name}
        </h1>
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          iconClass="text-lg"
          onClick={() => router.push("/users")}
        />
      </div>
      {userData && (
        <div className="my-6  lg:text-base sm:text-sm text-xs">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 xl:w-[40%] lg:w-[50%] capitalize">
            <div className="shadow-md sm:p-3 p-2 flex items-center justify-between">
              <div className="font-semibold ">Email:</div>
              <div className={`lowercase`}>{userData?.email || " "}</div>
            </div>

            <div className="shadow-md sm:p-3 p-2 flex items-center justify-between">
              <div className="font-semibold">Contact Number:</div>
              <div className="text-right">{userData?.phone_number || " "}</div>
            </div>
            <div className="shadow-md sm:p-3 p-2 flex items-center justify-between">
              <div className="font-semibold">Sex:</div>
              <div className="text-right">{userData?.sex || " "}</div>
            </div>
            <div className="shadow-md sm:p-3 p-2 flex items-center justify-between">
              <div className="font-semibold">Date of Birth:</div>
              <div className="text-right">{userData?.dob || " "}</div>
            </div>
            <div className="shadow-md sm:p-3 p-2 flex items-center justify-between">
              <div className="font-semibold">Created At:</div>
              <div className="text-right">
                {userData.created_at
                  ? formatDate(userData.created_at)
                  : "Not Available"}
              </div>
            </div>
            <div className="shadow-md sm:p-3 p-2 flex items-center justify-between">
              <div className="font-semibold">Status:</div>
              <div className="text-right">
                {userData.status === true ? (
                  <div className="flex items-center justify-end space-x-2 text-right ">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span className="">Inactive</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
