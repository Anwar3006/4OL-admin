"use client";

import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
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
          "id, comment, rating, user_profiles (first_name, last_name), healthcare_profiles (facility_name)"
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
    <Card className="min-h-[80vh] bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Reviews Details</h1>
        <Button
          icon="heroicons-outline:arrow-left"
          text="Back"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          iconClass="text-lg"
          onClick={() => router.back()}
        />
      </div>
      {reviewData && (
        <div className="p-6">
          <div className="grid grid-cols-2 gap-x-2 md:grid-cols-[minmax(100px,max-content)_1fr] md:gap-x-3">
            <div className="text-lg text-black-500">Full Name</div>
            <div className="text-gray-700">
              {reviewData.user_profiles.first_name || "N/A"}{" "}
              {reviewData?.user_profiles?.last_name || "N/A"}
            </div>

            <div className="text-lg text-black-500">Facility Name</div>
            <div className="text-gray-700">
              {reviewData.healthcare_profiles.facility_name || "N/A"}
            </div>

            <div className="text-lg text-black-500">Comment</div>
            <div className="text-gray-700">{reviewData.comment || "N/A"}</div>

            <div className="text-lg text-black-500">Rating</div>
            <div className="text-gray-700">{reviewData.rating || "N/A"}</div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ViewReviews;
