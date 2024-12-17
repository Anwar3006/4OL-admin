"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";

export default function HomeListing() {
  const [data, setData] = useState([]); // State to hold fetched data
  const [globalFilter, setGlobalFilter] = useState(""); // Search filter
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize] = useState(10); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const router = useRouter();

  // Fetch data from Supabase on component mount and when page changes
  useEffect(() => {
    const fetchData = async () => {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;

      const {
        data: fetchedData,
        error,
        count,
      } = await supabase
        .from("healthcare_profiles")
        .select("*", { count: "exact" })
        .range(from, to);

      if (error) {
        console.error("Error fetching data:", error);
        return;
      }

      setData(fetchedData || []);
      setTotalPages(Math.ceil(count / pageSize));
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
      .from("healthcare_profiles")
      .update({ is_deleted: true })
      .eq("id", id);

    if (error) {
      console.error("Error deleting data:", error);
    } else {
      setData((prevData) => prevData.filter((item) => item.id !== id));
    }
  };

  // Edit a record
  const handleEdit = (id) => router.push(`/admin/edit?id=${id}`);

  // View a record
  const handleView = (id) => router.push(`/admin/view?id=${id}`);

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Homes</h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
            <Button
              icon="heroicons-outline:plus-sm"
              text="Add Facility"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => router.push("/facility-profile-form")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Contact No</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-xs sm:text-sm">
            {filteredData.map((item) => (
              <tr
                key={item.id}
                onClick={() => handleView(item.id)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-2 capitalize">Homes</td>
                <td className="px-4 py-2 capitalize">{item.facility_name}</td>
                <td className="px-4 py-2">{item.region}</td>
                <td className="px-4 py-2">{item.contact_num}</td>
                <td className="px-4 py-2">{item.status || "Null"}</td>
                <td className="px-4 py-2">
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
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
}
