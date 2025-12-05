"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import PaginationNew from "@/components/ui/PaginationNew";
import Loading from "@/components/Loading";
import NoDataFound from "@/components/NoDataFound";
export default function Notifications() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const { data, error, count } = await supabase
          .from("notification_list")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

        if (error) {
          console.error("Error fetching notifications:", error);
        } else {
          setData(data || []);
          setTotalPages(Math.ceil((count || 0) / pageSize));
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [pageIndex, pageSize]);

  const filteredData = data.filter((item) => {
    const searchText = (globalFilter || "").toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(searchText) ||
      (item.description || "").toLowerCase().includes(searchText) ||
      (item.region || "").toLowerCase().includes(searchText)
    );
  });

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (pageIndex) => {
    setPageIndex(pageIndex);
  };

  const previousPage = () => {
    if (canPreviousPage) setPageIndex(pageIndex - 1);
  };

  const nextPage = () => {
    if (canNextPage) setPageIndex(pageIndex + 1);
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from("notification_list")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting notification:", error);
      } else {
        setData((prevData) => prevData.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleEdit = (id) => {
    // router.push(`/edit-facility-profile-form?id=${id}`);
  };

  const handleView = (id) => {
    // router.push(`/view-facility-profile?id=${id}`);
  };
  

  return (
    <Card className="min-h-[70vh]  mt-5" bodyClass="p-0">
      <div className="flex max-lg:flex-col p-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Notifications</h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
            <Button
              icon="ic:outline-notification-add"
              text="Push Notification"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => router.push("/send-notifications")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto  custom-scrollbar relative -mt-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase">
              <th className="sm:px-6 px-2 sm:py-3 py-2">Title</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Description</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Region</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Sex</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Age Range</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Created Date</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 sm:text-sm divide-y divide-gray-200 text-xs">
            {loading ? (
              <tr>
                <td colSpan="7" className="sm:px-6 px-2 sm:py-4 py-2 text-center">
                  <Loading />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="7" className="sm:px-6 px-2 sm:py-4 py-2 text-center">
                 <NoDataFound />
                </td>
              </tr>
            ) : (
              filteredData.map((item) => (
                <tr key={item.id} onClick={() => handleView(item.id)} className="cursor-pointer hover:bg-gray-50">
                  <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-slate-200">
                      {item.title || ""}
                    </div>
                  </td>
                  <td className="sm:px-6 px-2 sm:py-4 py-2">
                    <div className="max-w-xs truncate dark:text-slate-200">
                      {item.description || ""}
                    </div>
                  </td>
                  <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:text-slate-200">
                      {item.region || ''}
                    </span>
                  </td>
                  <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.sex === 'Male' ? 'bg-blue-100 text-blue-800 dark:text-slate-200' :
                      item.sex === 'Female' ? 'bg-pink-100 text-pink-800' :
                      'bg-gray-100 text-gray-800 dark:text-slate-200'
                    }`}>
                      {item.sex || 'All'}
                    </span>
                  </td>
                  <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:text-slate-200">
                      {item.age_range || ''}
                    </span>
                  </td>
                  <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-slate-200">
                    {item.created_at ? formatDate(item.created_at) : 'Unknown'}
                  </td>
                  <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                    <div className="flex justify-center items-center space-x-2">
                      <Button
                        icon="heroicons-outline:trash"
                        iconClass="text-base text-red-500 dark:text-slate-200"
                        className="p-0 bg-transparent border-none text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="m-6 flex justify-end items-end">
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
}
