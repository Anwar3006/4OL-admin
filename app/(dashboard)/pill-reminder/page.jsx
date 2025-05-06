"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/app/utils/supabaseClient";
import { useEffect, useState } from "react";
import Loading from "@/components/Loading";
import PaginationNew from "@/components/ui/PaginationNew";
import { useRouter } from "next/navigation";

const pillReminder = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize] = useState(13); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const router = useRouter();

  const fetchMedicationReminders = async () => {
    try {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from("medication_reminders")
        .select("*, user_profiles (first_name, last_name)", { count: "exact" })
        .range(from, to);

      if (error) {
        console.error("Error fetching medication reminders", error);
      }

      setData(data || []);
      setTotalPages(Math.ceil(count / pageSize));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicationReminders();
  }, [pageIndex, pageSize]);

  // Pagination controls
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (index) => setPageIndex(index);
  const previousPage = () => canPreviousPage && setPageIndex(pageIndex - 1);
  const nextPage = () => canNextPage && setPageIndex(pageIndex + 1);

  const handleView = (id) => {
    router.push(`/view-pill-reminder-details?id=${id}`);
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Pills Reminder</h6>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Medication name</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Medication Type</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr className="cursor-pointer hover:bg-gray-50">
                <td className="px-4 py-2 capitalize">
                  {item.user_profiles.first_name || "Ali"}{" "}
                  {item.user_profiles.last_name || "Hassan"}
                </td>
                <td className="px-4 py-2 capitalize">5-5-2025</td>
                <td className="px-4 py-2 capitalize">
                  {item.medication_name || "Cosmelon"}
                </td>
                <td className="px-4 py-2 capitalize">Critical</td>
                <td className="px-4 py-2 capitalize">
                  {item.medication_type || "Antibiotic"}
                </td>
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <Button
                      icon="lets-icons:eye"
                      iconClass="text-blue-500 text-xl"
                      className="p-1 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item.id);
                      }}
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

      <div className="mt-4 flex justify-end">
        <PaginationNew
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          gotoPage={gotoPage}
          previousPage={previousPage}
          nextPage={nextPage}
          pageIndex={pageIndex}
          pageOptions={pageOptions}
        />
      </div>
    </Card>
  );
};

export default pillReminder;
