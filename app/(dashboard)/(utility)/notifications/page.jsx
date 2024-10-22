"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import PaginationNew from "@/components/ui/PaginationNew";
import { notifications } from "@/constant/data";

export default function Notifications() {
  // const [data, setData] = useState(notifications);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const router = useRouter();

  // useEffect(() => {
  //   const fetchData = async () => {
  //     const { data, error, count } = await supabase
  //       .from("healthcare_profiles")
  //       .select("*", { count: "exact" })
  //       .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

  //     if (error) {
  //       console.error("Error fetching data:", error);
  //     } else {
  //       setData(data);
  //       setTotalPages(Math.ceil(count / pageSize));
  //     }
  //   };

  //   fetchData();
  // }, [pageIndex, pageSize]);

  const filteredData = notifications.filter((item) => {
    const searchText = (globalFilter || "").toLowerCase();
    return (
      (item.title || "").toLowerCase().includes(searchText) ||
      (item.desc || "").toLowerCase().includes(searchText)
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
    // const { error } = await supabase
    //   .from("healthcare_profiles")
    //   .delete()
    //   .eq("id", id); // Use `.eq` to delete a specific item by its ID

    // if (error) {
    //   console.error("Error deleting data:", error);
    // } else {
    //   setData((prevData) => prevData.filter((item) => item.id !== id));
    // }
  };

  const handleEdit = (id) => {
    // router.push(`/edit-facility-profile-form?id=${id}`);
  };

  const handleView = (id) => {
    // router.push(`/view-facility-profile?id=${id}`);
  };
  

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Notifications</h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
            <Button
              icon="ic:outline-notification-add"
              text="Push Notification"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => router.push("/send-notification")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto  custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              {/* <div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2">Title</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Description</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Image</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Region</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">District</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Target Group</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Age Range</th>
              {/* </div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
            {filteredData.map((item) => (
              
              <tr key={item.id} onClick={() => handleView(item.id)} className="cursor-pointer">
                {/* <div onClick={() => handleView(item.id)} className="cursor-pointer"> */}
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                {item.title || "Null"}
                <p className="text-xs">Created Mon Aug 17 2024</p>
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.desc || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.image ? 'Image' : 'Null'}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.region || 'Ahafo'}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.district || 'Asunafo South'}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.target_group || 'Users'}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.age_range || '18-24'}
                </td>
                {/* </div> */}
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <Button
                      icon="heroicons-outline:pencil-alt"
                      iconClass="text-base text-green-500" // Adjust the color and size as needed
                      className="p-0 bg-transparent border-none text-center " // No padding, transparent background, no border
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item.id);
                      }}
                    />
                    <Button
                      icon="heroicons-outline:trash"
                      iconClass="text-base text-red-500" // Adjust the color and size as needed
                      className="p-0 bg-transparent border-none text-center " // No padding, transparent background, no border
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

      <div className="mt-4 flex justify-end items-end">
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
