"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";
import Loading from "@/components/Loading";
import NoDataFound from "@/components/NoDataFound";

export default function PhysiotherapyListing() {
  const [data, setData] = useState([]); // State to hold fetched data
  const [globalFilter, setGlobalFilter] = useState(""); // Search filter
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize] = useState(10); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Fetch data from Supabase on component mount and when page changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;

        const {
          data: fetchedData,
          error,
          count,
        } = await supabase
          .from("facility_profile")
          .select("*", { count: "exact" })
          .range(from, to)
          .eq("status", "Approved")
          .eq("facility_type", "Physiotherapy");

        setData(fetchedData || []);
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageIndex, pageSize]);

  // Filter logic for the global search
  const filteredData = data.filter((item) => {
    const searchText = (globalFilter || "").toLowerCase();
    return (
      item.facility_name?.toLowerCase().includes(searchText) ||
      item.contact_num?.toLowerCase().includes(searchText) ||
      item.region?.toLowerCase().includes(searchText) ||
      item.status?.toLowerCase().includes(searchText)
    );
  });

  // Pagination controls
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (index) => setPageIndex(index);
  const previousPage = () => canPreviousPage && setPageIndex(pageIndex - 1);
  const nextPage = () => canNextPage && setPageIndex(pageIndex + 1);

  // Delete a specific record
  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("facility_profile")
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) {
      console.error("Error deleting data:", error);
    } else {
      setData((prevData) => prevData.filter((item) => item.id !== id));
    }
  };

  const handleEdit = (id) => {
    router.push(`/edit-facility-profile-form?id=${id}`);
  };

  const handleView = (id) => {
    router.push(`/view-facility-profile?id=${id}`);
  };

  return (
    <Card className="" bodyClass="p-0">
      <div className="flex max-lg:flex-col p-6 items-center w-full">
        <h6 className="md:mb-0 mb-0 w-full dark:text-gray-100">
          Physiotherapy
        </h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
            <Button
              icon="heroicons-outline:plus-sm"
              text="Add Facility"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => router.push("/facilities/add-facility")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar relative -mt-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase">
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Name</th>
              <th className="px-6 py-3">Region</th>
              <th className="px-6 py-3">Contact No</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 text-xs sm:text-sm">
            {filteredData.map((item) => (
              <tr
                key={item.id}
                onClick={() => handleView(item.id)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 capitalize">
                  {item.facility_type}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                  {item.facility_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.region}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.contact_num}
                </td>
                <td className="py-4 text-sm">
                  <span className="bg-green-100 py-2 px-4 text-green-700 dark:text-green-100 rounded-full">
                    {item.status || "Null"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <Button
                      icon="lets-icons:eye"
                      iconClass="text-blue-500 text-lg"
                      className="p-0 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item.id);
                      }}
                    />
                    <Button
                      icon="heroicons-outline:pencil-alt"
                      iconClass="text-green-500 text-lg"
                      className="p-0 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item.id);
                      }}
                    />
                    <Button
                      icon="heroicons-outline:trash"
                      iconClass="text-red-500 text-lg"
                      className="p-0 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  <Loading />
                </td>
              </tr>
            )}

            {filteredData.length === 0 && !loading && (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-10 text-base text-gray-500 dark:text-gray-100"
                >
                  <NoDataFound />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-end p-4 border-t bg-white dark:bg-slate-800 z-10">
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
