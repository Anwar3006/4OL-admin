"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";

export default function UserGroups() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState([]);
  const router = useRouter();

  const fetchData = async () => {
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    try {
      const {data, error, count} = await supabase
      .from('notification_list')
      .select('*', {count: "exact"})
      .order("created_at", {ascending: false})
      .range(from, to);
      if(error){
        console.error(error);
      } else{
        setData(data);
        setTotalPages(Math.ceil(count / pageSize))
      }
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    fetchData();
  },[])

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (pageIndex) => { setPageIndex(pageIndex)};
  const previousPage = () => { if (canPreviousPage) setPageIndex(pageIndex - 1);};
  const nextPage = () => { if (canNextPage) setPageIndex(pageIndex + 1);};

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Notifications</h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
            <Button
              icon="ic:outline-notification-add"
              text="Send Notification"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => router.push("/send-notifications")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto  custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 w-full">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="sm:px-6 px-2 sm:py-3 py-2">Title</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Description</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Region</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Sex</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Age Range</th>
            </tr>
          </thead>
          <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
            {data.map((item) => (
              
              <tr key={item.id} className="cursor-pointer">
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                {item.title || "Null"}
                <p className="text-xs">{item.created_at ? new Date(item.created_at).toDateString(): "null"}</p>
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.description || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.region || 'Ahafo'}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.sex || 'Male'}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.age_range || '18-24'}
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
