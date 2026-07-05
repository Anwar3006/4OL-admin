"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import Button from "@/components/ui/Button";
import Loading from "@/components/Loading";
import { useApproveFacility } from "@/hooks/supabase-calls/useFacilities";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { facilityFields } from "@/constant/facility-labels-data";

export default function Page() {
  const router = useRouter();
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: session } = useSupabaseSession();
  const { mutate: approveFacility, isPending: isApproving } = useApproveFacility();

  useEffect(() => {
    const fetchFacility = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("facility_profile")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching facility data:", error);
        setError(error.message);
      } else {
        setFacility(data);
      }
      setLoading(false);
    };

    fetchFacility();
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <div>Error: {error}</div>;

  const handleEdit = (id) => {
    router.push(`/edit-facility-profile-form?id=${id}`);
  };

  return (
    <Card
      className="min-h-[70vh] bg-white mt-5"
      title={"Facility Details"}
      headerslot={
        <>
          {" "}
          <Button
            icon="heroicons-outline:arrow-left"
            text="Back"
            className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
            iconClass="text-lg"
            onClick={() => router.back()}
          />
        </>
      }
    >
      {facility && (
        <div className="sm:text-sm text-xs text-gray-600 lg:w-[80%] w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 capitalize">
            {facilityFields.map(({ label, key, format }) => (
              <div className="flex" key={key}>
                <div className="w-1/3 text-gray-900">{label}</div>
                <div className={`w-2/3 ${key === "email" ? "lowercase" : ""}`}>
                  {facility[key]
                    ? format
                      ? format(facility[key])
                      : facility[key]
                    : "Not Available"}
                </div>
              </div>
            ))}

            {/* Status */}
            <div className="flex">
              <div className="w-1/3 text-gray-900">Status</div>
              <div className="w-2/3">
                {facility.status === "Approved" ? (
                  <div className="flex items-center">
                    <p className="bg-green-100 text-green-500 px-4 py-1 rounded-full flex items-center text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>{" "}
                      Approved
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="bg-yellow-100 text-yellow-500 px-4 py-1 rounded-full flex items-center text-sm">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>{" "}
                      Pending
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Business Hours */}
          {facility.business_hours && (
            <>
              <div className="mt-6 mb-2 text-sm font-bold text-black-500">
                Business Hours
              </div>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="flex justify-between items-center text-gray-900 xl:w-[30%] sm:w-[50%]">
                  <div className="flex-1">Days</div>
                  <div className="flex-1 text-center">Opening Hours</div>
                  <div className="flex-1 text-right">Closing Hours</div>
                </div>
                {Object.entries(facility.business_hours).map(([day, hours]) => (
                  <div
                    key={day}
                    className="flex justify-between items-center xl:w-[30%] sm:w-[50%]"
                  >
                    <div className="font-medium flex-1 capitalize">{day}</div>
                    <div className="flex-1 text-center">{hours.opening}</div>
                    <div className="flex-1 text-center">{hours.closing}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              className="px-6 py-1 text-white bg-secondary-800 border-2 border-secondary-800 hover:text-secondary-800 hover:bg-transparent"
              onClick={() => handleEdit(facility.id)}
              text="Edit"
            />
            <Button
              className="px-6 py-1 text-secondary-800 bg-transparent border-2 border-secondary-800 hover:text-white hover:bg-secondary-800"
              text={isApproving ? "Approving..." : "Approve"}
              disabled={isApproving}
              onClick={() => {
                approveFacility(
                  {
                    adminId: session?.user?.id,
                    id: facility.id,
                    media_urls: facility.media_urls || [],
                    featured_image_url: facility.featured_image_url,
                  },
                  { onSuccess: () => router.back() }
                );
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
