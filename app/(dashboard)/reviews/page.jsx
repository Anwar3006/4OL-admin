"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/app/utils/supabaseClient";
import { useEffect, useState } from "react";

const Reviews = () => {
  const [ratingData, setRatingData] = useState([]);

  const fetchRatings = async () => {
    const { data, error } = await supabase
      .from("facility_ratings")
      .select("comment, rating");

    if (error) {
      console.error(error);
    }
    setRatingData(data || []);
  };

  useEffect(() => {
    fetchRatings();
  }, []);
  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Reviews</h6>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="px-4 py-3">Comment</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Action</th>
              {/* <th className="px-4 py-3">Medication name</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Medication Type</th>
              <th className="px-4 py-3">Action</th> */}
            </tr>
          </thead>
          <tbody>
            {ratingData.map((item) => (
              <tr className="cursor-pointer hover:bg-gray-50 border-b border-gray-100">
                <td className="px-4 py-2 capitalize">{item.rating}</td>
                <td className="px-4 py-2 capitalize">
                  {item.comment || "hello"}
                </td>
                {/* <td className="px-4 py-2 capitalize">Cosmelon</td>
              <td className="px-4 py-2 capitalize">Critical</td>
              <td className="px-4 py-2 capitalize">Antibiotic</td> */}
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <Button
                      icon="lets-icons:eye"
                      iconClass="text-blue-500 text-lg"
                      className="p-0 bg-transparent border-none"
                    />
                    <Button
                      icon="material-symbols:download"
                      iconClass="text-red-500 text-lg"
                      className="p-0 bg-transparent border-none"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default Reviews;
