"use client";

import React, { useEffect, useState } from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import Button from "@/components/ui/Button";
import moment from "moment";
import * as XLSX from "xlsx"; // Import XLSX library
import Icons from "@/components/ui/Icon";

export default function UserActivity({ user }) {
  const [isDark] = useDarkmode();
  const [data, setData] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // State for loading
  const [hasError, setHasError] = useState(false); // Optional: State for errors

  const searchParams = useSearchParams();

  // Extract ID from query parameters
  const id = searchParams.get("id");

  // Filter States
  const [userFilter, setUserFilter] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState(
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [toDate, setToDate] = useState(
    moment().endOf("month").format("YYYY-MM-DD")
  );

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Start loading
      setHasError(false); // Reset error state

      try {
        let query = supabase
          .from("activity_logs")
          .select("*", { count: "exact" })
          .eq("user_id", id)
          .order("created_at", { ascending: false })
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
          setHasError(true); // Set error state
        } else {
          setData(data);
          setTotalPages(Math.ceil(count / pageSize));
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setHasError(true);
      } finally {
        setIsLoading(false); // End loading
      }
    };

    if (id) fetchData();
  }, [pageIndex, pageSize, userFilter, logTypeFilter, fromDate, toDate, id]);

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

  const fetchAllData = async () => {
    try {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
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
      const { data: allData, error, count } = await query;
      if (error) {
        console.error("Error fetching data:", error);
      } else {
        downloadExcel(allData);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
    }
  };

  const downloadExcel = (dataToDownload) => {
    const formattedData = dataToDownload.map((item) => ({
      "Date & Time": item?.timestamp || "--",
      "Log Type": item.type || "",
      "Done By": item.user_name || "",
      Description:
        item.description +
        (item?.type !== "authentication" && item?.reference
          ? ` (${item?.reference})`
          : ""),
      IP: item.ip || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "User Activity");
    XLSX.writeFile(workbook, `User Activity (${user}).xlsx`);
  };

  return (
    <>
      <div className="border-t border-gray-200 mt-16 pt-4">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
            <div className="w-full flex flex-col justify-center sm:p-5">
              <div className="min-h-[80vh] bg-white">
                <div className="flex max-lg:flex-col pb-6 items-center w-full">
                  <h6 className="md:mb-0 mb-3 w-full text-xl font-bold capitalize">
                    User Activity
                  </h6>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap justify-center space-x-4 mb-8 items-center">
                  <div className="flex-1 flex flex-wrap space-x-4 items-center">
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
                        onChange={(e) => {
                          if (isLoading) return;
                          setLogTypeFilter(e.target.value);
                          setPageIndex(0);
                        }}
                      >
                        <option value="">All Logs</option>
                        <option value="authentication">Authentication</option>
                        <option value="facility">Facility</option>
                        <option value="disease">Disease</option>
                        <option value="symptom">Symptom</option>
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
                        onChange={(e) => {
                          if (isLoading) return;
                          setFromDate(e.target.value);
                          setPageIndex(0);
                        }}
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
                        onChange={(e) => {
                          if (isLoading) return;
                          setToDate(e.target.value);
                          setPageIndex(0);
                        }}
                      />
                    </div>
                  </div>
                  {data.length > 0 && !isLoading && (
                    <div className="flex flex-wrap space-x-4 items-center">
                      <div
                        className="flex items-center space-x-2 cursor-pointer border rounded-md px-4 py-2"
                        onClick={() => downloadExcel(data)}
                      >
                        <Icons
                          icon={"heroicons-outline:download"}
                          className="text-base text-green-500"
                        />
                        <button className="text-base text-green-500">
                          Download
                        </button>
                      </div>
                      <div
                        className="flex items-center space-x-2 cursor-pointer border rounded-md px-4 py-2"
                        onClick={() => fetchAllData()}
                      >
                        <Icons
                          icon={"heroicons-outline:download"}
                          className="text-base text-green-500"
                        />
                        <button className="text-base text-green-500">
                          Download All
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Loader */}
                {isLoading && (
                  <div className="flex justify-center items-center py-10">
                    <p>Loading...</p>
                  </div>
                )}

                {/* Error Handling */}
                {/* {hasError && !isLoading && (
                  <div className="flex justify-center items-center py-10">
                    <p className="text-red-500">
                      An error occurred while fetching data.
                    </p>
                  </div>
                )} */}

                {/* Data Table */}
                {!isLoading && data.length === 0 && !hasError && (
                  <div className="flex justify-center items-center py-10">
                    <p>No records found.</p>
                  </div>
                )}

                {!isLoading && data.length > 0 && (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
                          <th className="sm:px-6 px-2 sm:py-3 py-2">
                            Date & Time
                          </th>
                          <th className="sm:px-6 px-2 sm:py-3 py-2">
                            Log Type
                          </th>
                          <th className="sm:px-6 px-2 sm:py-3 py-2">Done By</th>
                          <th className="sm:px-6 px-2 sm:py-3 py-2">
                            Description
                          </th>
                          <th className="sm:px-6 px-2 sm:py-3 py-2">IP</th>
                          {/* <th className="sm:px-6 px-2 sm:py-3 py-2">Actions</th> */}
                        </tr>
                      </thead>
                      <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
                        {data?.map((item) => (
                          <tr className="capitalize" key={item.id}>
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
                              {item?.type !== "authentication" &&
                              item?.reference
                                ? `(${item?.reference})`
                                : ""}
                            </td>
                            <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap lowercase">
                              {item.ip}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {data.length > 0 && !isLoading && (
                  <div className="mt-4 flex justify-end items-end w-full overflow-auto">
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
