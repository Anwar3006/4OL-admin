"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { fetchFacilityRatings } from "@/app/services/fetchFacilityRatings";

const Reviews = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRatings = async () => {
      try {
        const data = await fetchFacilityRatings();
        console.log("RATINGS INFORMATION ==>", data);
        setRatings(data || []);
      } catch (error) {
        console.error("Failed to fetch ratings", error);
      } finally {
        setLoading(false);
      }
    };
    getRatings();
  }, []);

  if (loading)
    return (
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
    );

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Reviews</h6>
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="px-4 py-3">First name</th>
              <th className="px-4 py-3">Last name</th>
              <th className="px-4 py-3">Facility name</th>
              <th className="px-4 py-3">Comments</th>
              <th className="px-4 py-3">Rating</th>
              {/* <th className="px-4 py-3">Medication Type</th> */}
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((item) => (
              <tr className="cursor-pointer hover:bg-gray-50 border-b border-gray-100">
                <td className="px-4 py-2 capitalize">
                  {item.first_name || "Ali"}
                </td>
                <td className="px-4 py-2 capitalize">
                  {item.last_name || "Hassan"}
                </td>
                <td className="px-4 py-2 capitalize">
                  {item.facility_name || "Ali"}
                </td>
                <td className="px-4 py-2 capitalize">
                  {item.comment || "Hello"}
                </td>
                <td className="px-4 py-2 capitalize">{item.rating || "2"}</td>
                {/* <td className="px-4 py-2 capitalize">Cosmelon</td>
              <td className="px-4 py-2 capitalize">Critical</td>
              <td className="px-4 py-2 capitalize">Antibiotic</td> */}
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <Button
                      icon="lets-icons:eye"
                      iconClass="text-blue-500 text-xl"
                      className="p-1 bg-transparent border-none"
                    />
                    <Button
                      icon="heroicons-outline:download"
                      iconClass="text-green-500 text-xl"
                      className="p-1 bg-transparent border-none"
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
