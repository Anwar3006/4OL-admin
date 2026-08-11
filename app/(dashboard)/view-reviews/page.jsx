"use client";

import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Icon } from "@iconify/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const ViewReviews = () => {
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();

  const fetchReviews = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("facility_ratings")
        .select(
          "id, comment, rating, user_profiles (first_name, last_name), facility_profile (facility_name)"
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching Reviews", error);
      }
      setReviewData(data || []);
    } catch (error) {
      console.error("Error fetching Reviews", error);
    } finally {
      setLoading(false);
    }
    console.log("testing");
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  return (
    <Card className="min-h-[70vh] bg-white mt-5">
      <CardHeader className="flex flex-row justify-between items-center mb-4">
        <CardTitle>Reviews Details</CardTitle>
        <div>
          <Button
            className="max-sm:text-xs font-normal mr-3 max-sm:mt-2 px-3 h-8"
            variant="default"
            onClick={() => router.back()}
          >
            <Icon icon="heroicons-outline:arrow-left" className="text-lg mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
      {reviewData && (
        <div className="sm:text-sm text-xs text-gray-600 lg:w-[50%] w-full">
          <div className="grid grid-cols-1 gap-2 capitalize  lg:p-6 p-4">
            <div className="flex">
              <p className="w-1/3 text-gray-900">Full Name</p>
              <p className="w-2/3">
                {reviewData.user_profiles.first_name || "N/A"}{" "}
                {reviewData?.user_profiles?.last_name || "N/A"}
              </p>
            </div>

            <div className="flex">
              <p className="w-1/3 text-gray-900">Facility Name</p>
              <p className="w-2/3">
                {reviewData.facility_profile.facility_name || "N/A"}
              </p>
            </div>

            <div className="flex">
              <p className="w-1/3 text-gray-900">Comment</p>
              <p className="w-2/3">{reviewData.comment || "N/A"}</p>
            </div>

            <div className="flex">
              <p className="w-1/3 text-gray-900">Rating</p>
              <p className="w-2/3">{reviewData.rating || "N/A"}</p>
            </div>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
};

export default ViewReviews;
