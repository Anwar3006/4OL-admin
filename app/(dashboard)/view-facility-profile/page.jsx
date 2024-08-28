"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import Button from "@/components/ui/Button";

export default function page() {
  const router = useRouter();
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const searchParams = useSearchParams();

  // Extract ID from query parameters
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchFacility = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("healthcare_profiles")
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Facility Details</h1>
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          iconClass="text-lg"
          onClick={() => router.push("/users-facility")}
        />
      </div>
      {facility && (
        <div className="my-6  lg:text-base sm:text-sm text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 capitalize">
            <div className="font-semibold">Facility Name:</div>
            <div>{facility.facility_name || "Not Available"}</div>

            <div className="font-semibold">Facility Type:</div>
            <div>{facility.facility_type?.join(", ") || "Not Available"}</div>

            <div className="font-semibold">Contact Number:</div>
            <div>{facility.contact_num || "Not Available"}</div>

            <div className="font-semibold">Whatsapp:</div>
            <div>{facility.whatsapp || "Not Available"}</div>

            <div className="font-semibold ">Email:</div>
            <div className={`${facility.email? 'lowercase' : 'capitalize'}`}>{facility.email || 'Not Available'}</div>

            <div className="font-semibold">GPS Address:</div>
            <div>{facility.gps_address || "Not Available"}</div>

            <div className="font-semibold">Street:</div>
            <div>{facility.street || "Not Available"}</div>

            <div className="font-semibold">Post Code:</div>
            <div>{facility.post_code || "Not Available"}</div>

            <div className="font-semibold">Area:</div>
            <div>{facility.area || "Not Available"}</div>

            <div className="font-semibold">District:</div>
            <div>{facility.district || "Not Available"}</div>

            <div className="font-semibold">Region:</div>
            <div>{facility.region || "Not Available"}</div>

            <div className="font-semibold">Country:</div>
            <div>{facility.country || "Not Available"}</div>

            <div className="font-semibold">Hospital Services:</div>
            <div>
              {facility.hospital_services?.join(", ") || "Not Available"}
            </div>

            <div className="font-semibold">Hospital Amenities:</div>
            <div>
              {facility.hospital_amenities?.join(", ") || "Not Available"}
            </div>

            <div className="font-semibold">Pharmacy Services:</div>
            <div>
              {facility.pharmacy_services?.join(", ") || "Not Available"}
            </div>

            <div className="font-semibold">Created At:</div>
            <div>
              {facility.created_at
                ? formatDate(facility.created_at)
                : "Not Available"}
            </div>

            <div className="font-semibold">Status:</div>
            <div>
              {facility.status === "Active" ? (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="">Active</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="">In Active</span>
                </div>
              )}
            </div>
          </div>


          <div className="mt-6 mb-4 font-semibold">Business Hours</div>
          <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between items-center font-semibold xl:w-[30%] sm:w-[50%]">
      <div className=" flex-1">Days</div>
      <div className="flex-1 text-center">Opening Hours</div>
      <div className="flex-1 text-right">Closing Hours</div>
    </div>
  {Object.entries(facility.business_hours).map(([day, hours]) => (
    <div key={day} className="flex justify-between items-center xl:w-[30%] sm:w-[50%]">
      <div className="font-medium flex-1">{day.charAt(0).toUpperCase() + day.slice(1)}</div>
      <div className="flex-1 text-center">{hours.opening}</div>
      <div className="flex-1 text-center">{hours.closing}</div>
    </div>
  ))}
</div>

        </div>
      )}
    </Card>
  );
}
