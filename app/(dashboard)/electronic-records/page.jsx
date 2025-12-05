"use client";

import React, { useEffect, useState } from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Button from "@/components/ui/Button";
import moment from "moment";

export default function page() {

  const [isDark] = useDarkmode();
  const [data, setData] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // Filter States
  const [userFilter, setUserFilter] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      let query = supabase
        .from("activity_logs")
        .select("*", { count: "exact" })
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

      if (userFilter) query = query.ilike("user_name", `%${userFilter}%`);
      if (logTypeFilter) query = query.eq("type", logTypeFilter);
      if (fromDate) {
        const formattedStartDate = moment(fromDate)
          .startOf("day")
          .format("DD-MM-YYYY HH:mm:ss");
        query = query.gte("timestamp", formattedStartDate);
      }
      if (toDate) {
        const formattedEndDate = moment(toDate)
          .endOf("day")
          .format("DD-MM-YYYY HH:mm:ss");
        query = query.lte("timestamp", formattedEndDate);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setData(data);
        setTotalPages(Math.ceil(count / pageSize));
      }
    };

    fetchData();
  }, [pageIndex, pageSize, userFilter, logTypeFilter, fromDate, toDate]);
  

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
  }
  
  return (
    <>
      <div className="">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <div className=" w-full flex flex-col justify-center sm:p-5">
              <Card className="min-h-[70vh] bg-white">
                <div className="flex max-lg:flex-col pb-6 items-center w-full">
                  <h6 className="md:mb-0 mb-3 w-full">Electronic Records</h6>
                </div>
                <div className="flex flex-wrap justify-center space-x-4 mb-8 items-center">
                  {/* User Filter */}
                  <div className="flex flex-col">
                    <label
                      htmlFor="userFilter"
                      className="text-sm font-medium mb-1"
                    >
                      User
                    </label>
                    <input
                      id="userFilter"
                      type="text"
                      className="px-4 py-2 border rounded-md"
                      placeholder="Search User by Name"
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                    />
                  </div>

                  {/* Log Type Filter */}
                  <div className="flex flex-col">
                    <label
                      htmlFor="logTypeFilter"
                      className="text-sm font-medium mb-1"
                    >
                      Log Type
                    </label>
                    <select
                      id="logTypeFilter"
                      className="px-4 py-2 border rounded-md"
                      value={logTypeFilter}
                      onChange={(e) => setLogTypeFilter(e.target.value)}
                    >
                      <option value="">Select Log Type</option>
                      <option value="authentication">Authentication</option>
                      <option value="facility">Facility</option>
                      <option value="disease">Disease</option>
                      <option value="symptom">Symptom</option>
                      {/* Add more log types here */}
                    </select>
                  </div>

                  {/* Date Filters */}
                  <div className="flex flex-col">
                    <label
                      htmlFor="fromDate"
                      className="text-sm font-medium mb-1"
                    >
                      From Date
                    </label>
                    <input
                      id="fromDate"
                      type="date"
                      className="px-4 py-2 border rounded-md"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="toDate"
                      className="text-sm font-medium mb-1"
                    >
                      To Date
                    </label>
                    <input
                      id="toDate"
                      type="date"
                      className="px-4 py-2 border rounded-md"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto  custom-scrollbar">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                        <th className="sm:px-6 px-2 sm:py-3 py-2">
                          Date & Time
                        </th>
                        <th className="sm:px-6 px-2 sm:py-3 py-2">Log Type</th>
                        <th className="sm:px-6 px-2 sm:py-3 py-2">Done By</th>
                        <th className="sm:px-6 px-2 sm:py-3 py-2">
                          Description
                        </th>
                        <th className="sm:px-6 px-2 sm:py-3 py-2">IP</th>
                        <th className="sm:px-6 px-2 sm:py-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                      {data?.map((item) => (
                        <tr className="capitalize">
                          <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                            {item?.timestamp ? item.timestamp : "--"}
                          </td>
                          <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                            {item.type}
                          </td>
                          <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                            {item.user_name}
                          </td>
                          <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                            {item.description}{" "}
                            {item?.type != "authentication" && item?.reference
                              ? `(${item?.reference})`
                              : ""}
                          </td>
                          <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap lowercase">
                            {item.ip}
                          </td>
                          <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <Button
                                icon="heroicons-outline:download"
                                iconClass="text-base text-green-500"
                                className="p-0 bg-transparent border-none text-center "
                                onClick={(e) => {
                                  e.stopPropagation();
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
