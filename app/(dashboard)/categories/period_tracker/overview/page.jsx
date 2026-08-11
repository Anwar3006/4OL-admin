"use client";
import {
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  deletePeriodTrackerLog,
  getPeriodTrackerLogs,
} from "@/app/services/period_tracker_service";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Icons from "@/components/ui/Icon";
import moment from "moment";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import Loading from "@/components/Loading";
import NoDataFound from "@/components/NoDataFound";

const PeriodsTrackerPage = () => {
  const router = useRouter();

  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showFertileWindow, setShowFertileWindow] = useState(false);
  const [showFlowTypes, setShowFlowTypes] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const searchRef = useRef(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPeriodTrackerLogs();
      if (data) {
        setLogs(data);
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search filtering
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredLogs([]);
      setShowDropdown(false);
    } else {
      const filtered = logs.filter((log) =>
        log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.period_start_date?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLogs(filtered);
      setShowDropdown(true);
    }
  }, [searchQuery, logs]);

  // Update total pages based on search results
  useEffect(() => {
    const dataToDisplay = searchQuery && filteredLogs.length > 0
      ? filteredLogs
      : logs;
    setTotalPages(Math.ceil(dataToDisplay.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when items per page changes
  }, [logs, filteredLogs, searchQuery, itemsPerPage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLog = (log) => {
    setSearchQuery(log.user?.email || log.period_start_date);
    setShowDropdown(false);
    // Scroll to the log in the table
    const logIndex = logs.findIndex((l) => l.id === log.id);
    if (logIndex !== -1) {
      const pageNumber = Math.floor(logIndex / itemsPerPage) + 1;
      setCurrentPage(pageNumber);
    }
  };

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    let timeout;
    const onScroll = () => {
      container.classList.add("scrolling");
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        container.classList.remove("scrolling");
      }, 300); // Remove after 300ms of no scroll events
    };

    container.addEventListener("scroll", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, []);

  // Update the handleEdit function in overview/page.jsx
  const handleEdit = (item) => {
    const encodedItem = encodeURIComponent(JSON.stringify(item));
    router.push(`/categories/period_tracker/create?item=${encodedItem}`);
  };

  const handleViewDetails = (item) => {
    router.push(`/categories/period_tracker/details?id=${item.id}`);
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dataToDisplay = searchQuery && filteredLogs.length > 0
      ? filteredLogs
      : logs;
    return dataToDisplay.slice(startIndex, endIndex);
  };

  const deleteItem = async (id) => {
    try {
      const { error } = await deletePeriodTrackerLog(id);
      if (error) throw error;

      // Close modal and refresh data
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchLogs();
      toast.success("Period tracker deleted successfully");
    } catch (error) {
      console.error("Error deleting period tracker:", error);
      toast.error("Failed to delete period tracker");
    }
  };

  const deleteModal = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  return (
    <div className="">
      <div className="mt-5 relative">
        <Card
          title="Periods Tracker"
          className=" overflow-hidden"
          bodyClass="p-0"
          headerslot={
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Filter */}
              <div className="relative" ref={searchRef}>
                <div className="relative">
                  <Icon
                    icon="heroicons:magnifying-glass"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    width="18"
                  />
                  <input
                    type="text"
                    placeholder="Search by email or date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setShowDropdown(true)}
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200 w-64"
                  />
                </div>
                {/* Autocomplete Dropdown */}
                {showDropdown && filteredLogs.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredLogs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        onClick={() => handleSelectLog(log)}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-900 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                      >
                        <div>{log.user?.email || "Unknown User"}</div>
                        <div className="text-xs text-gray-500">{log.period_start_date}</div>
                      </div>
                    ))}
                  </div>
                )}
                {showDropdown && searchQuery && filteredLogs.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg">
                    <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
                      No results found
                    </div>
                  </div>
                )}
              </div>
              <Button
                text="Add Period Tracker"
               
                className="btn-dark max-sm:text-xs font-normal btn-sm"
                onClick={() => router.push("/categories/period_tracker/create")}
              />
            </div>
          }
        >
          {/* <div className="absolute top-2 right-2 justify-end p-4">
            <Button
              text="Add Period Tracker"
             
              className="bg-[#56ce84] text-white rounded-md p-2 text-sm hover:bg-[#46b276] transition-colors"
              onClick={() => router.push("/categories/period_tracker/create")}
            />
          </div> */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto relative hidden-scrollbar"
          >
            <table className="w-full bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700 min-w-max">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr className="text-center text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap text-left">
                    User
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap text-left">
                    Email
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap text-left">
                    Phone
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap text-left">
                    Region
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap text-left">
                    Goal
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Cycle
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Period
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Consistent
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Start
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Reminder
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Ovulation
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Fertile
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Flow
                  </th>
                  <th className="sm:px-6 px-4 sm:py-3 py-2 whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {getCurrentPageData().length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan="14"
                      className="text-center py-20 text-base text-gray-500 dark:text-slate-300"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <NoDataFound />
                      </div>
                    </td>
                  </tr>
                ) : (
                  getCurrentPageData().map((log) => (
                    <tr
                      key={log.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-center transition"
                    >
                      <td className="text-gray-900 dark:text-slate-200 px-3 py-3 whitespace-nowrap text-left">
                        <div className="flex items-center space-x-3">
                          {log.user_profiles?.avatar_url ? (
                            <Image
                              className="w-8 h-8 rounded-full object-cover"
                              src={log.user_profiles.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              unoptimized
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                              <Icon
                                icon="heroicons:user"
                                className="w-4 h-4 text-gray-500 dark:text-slate-300"
                              />
                            </div>
                          )}
                          <span className="font-medium">
                            {log.user_profiles?.first_name}{" "}
                            {log.user_profiles?.last_name}
                          </span>
                        </div>
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap text-left">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="hover:text-green-500 transition-colors"
                        >
                          {log.user_profiles?.email}
                        </button>
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap text-left">
                        {log.user_profiles?.phone_number}
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap text-left">
                        {log.user_profiles?.region}
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap text-left">
                        {log.goal}
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap">
                        {log.cycle_length}d
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap">
                        {log.period_length}d
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.is_consistent === 'Yes' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {log.is_consistent}
                        </span>
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap">
                        {moment(log.period_start_date).format("DD/MM/YY")}
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap uppercase">
                        {moment(log.next_reminder).format("DD/MM/YY")}
                      </td>
                      <td className="text-gray-500 dark:text-slate-300 px-3 py-3 whitespace-nowrap uppercase">
                        {moment(log.ovulation_date).format("DD/MM/YY")}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowFertileWindow(true);
                          }}
                          className="text-purple-500 hover:text-purple-700 transition"
                        >
                          <Icon icon="healthicons:sexual-reproductive-health" className="w-6 h-6 inline" />
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setShowFlowTypes(true);
                          }}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <Icon icon="bi:droplet-fill" className="w-5 h-5 inline" />
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <div className="flex justify-center items-center gap-3">
                          <button
                            className="text-gray-400 hover:text-green-500 transition"
                            onClick={() => handleEdit(log)}
                          >
                            <Icon icon="heroicons-outline:pencil-alt" className="w-5 h-5" />
                          </button>
                          <button
                            className="text-gray-400 hover:text-red-500 transition"
                            onClick={() => deleteModal(log)}
                          >
                            <Icon icon="heroicons-outline:trash" className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {loading && (
                  <tr>
                    <td colSpan="14" className="text-center py-20">
                      <Loading />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Delte Modal */}
        <Modal
          title="Delete Period Tracker"
          titleClass="text-white text-lg"
          activeModal={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setItemToDelete(null);
          }}
          centered
          themeClass="bg-red-500"
        >
          <div className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 rounded-full bg-red-100 flex items-center justify-center">
                <Icon
                  icon="heroicons:exclamation-triangle"
                  className="w-24 h-24 text-red-500"
                />
              </div>
              <p className="text-center text-gray-700 dark:text-gray-300">
                Are you sure you want to delete{" "}
                <span className="font-semibold">
                  {itemToDelete?.user_profiles?.first_name}{" "}
                  {itemToDelete?.user_profiles?.last_name}
                </span>
                's period tracker?
              </p>
              <div className="flex gap-3 mt-4 w-full">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setItemToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-[#56ce84] text-white rounded-md hover:bg-[#46b276] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteItem(itemToDelete?.id)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Fertile Window Modal */}
        <Modal
          titleClass="text-white text-lg"
          title="Fertile Window Dates:"
          activeModal={showFertileWindow}
          onClose={() => setShowFertileWindow(false)}
          centered
          themeClass="bg-[#4ab573]"
        >
          <div className="p-4">
            <Calendar
              value={
                selectedLog?.fertile_window_dates?.length
                  ? new Date(selectedLog.fertile_window_dates[0])
                  : selectedLog?.period_start_date
                  ? new Date(selectedLog.period_start_date)
                  : new Date()
              }
              className="custom-calendar"
              selectRange={false}
              showNeighboringMonth={true}
              tileClassName={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Add position-relative class to all tiles for proper dot positioning
                let classes = "position-relative m-1";

                if (selectedLog?.fertile_window_dates?.includes(dateString)) {
                  classes += " fertile-date";
                }

                return classes;
              }}
              tileContent={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                if (selectedLog?.fertile_window_dates?.includes(dateString)) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#9333ea",
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                }
                return null;
              }}
            />
            <div className="mt-3 flex items-center">
              <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
              <span className="text-sm">Fertile Window Days</span>
            </div>

            {/* Add custom styles to fix all the issues */}
            <style jsx global>{`
              /* Fix weekend colors */
              .custom-calendar .react-calendar__month-view__days__day--weekend {
                color: black !important;
              }

              /* Basic tile styling */
              .custom-calendar .react-calendar__tile {
                margin: 2px;
                border-radius: 4px;
                position: relative !important;
                height: 40px;
                background: none;
              }

              /* Fertility day styling */
              .custom-calendar .fertile-date {
                background-color: rgba(168, 85, 247, 0.2) !important;
              }

              /* Reset today's special styling */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
              }

              /* Reset active/selected date styling */
              .custom-calendar .react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--hasActive {
                background: inherit !important;
                color: inherit !important;
              }

              /* Apply fertility styling even when active/hover */
              .custom-calendar .fertile-date:hover,
              .custom-calendar .fertile-date:focus,
              .custom-calendar .fertile-date.react-calendar__tile--active {
                background-color: rgba(168, 85, 247, 0.3) !important;
              }

              .position-relative {
                position: relative !important;
              }

              /* Fix for Sunday display */
              .custom-calendar .react-calendar__month-view__days {
                display: grid !important;
                grid-template-columns: repeat(7, 1fr);
              }

              /* Ensure all days are visible */
              .custom-calendar .react-calendar__month-view__days__day {
                display: flex !important;
                justify-content: center;
                align-items: center;
              }

              /* Reset today's styling more aggressively */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
                border: none !important;
                outline: none !important;
              }

              /* Force fertility styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.fertile-date {
                background-color: rgba(168, 85, 247, 0.2) !important;
              }

              /* Force flow styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.flow-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Ensure dots remain visible on today's date */
              .custom-calendar .react-calendar__tile--now .dot-indicator {
                display: block !important;
              }
            `}</style>
          </div>
        </Modal>

        {/* Flow Types Modal */}
        <Modal
          titleClass="text-white text-lg"
          themeClass="bg-[#4ab573]"
          title="Flow Types by Date:"
          activeModal={showFlowTypes}
          onClose={() => setShowFlowTypes(false)}
          centered
        >
          <div className="p-4">
            <Calendar
              value={
                selectedLog?.flow_types?.length
                  ? new Date(selectedLog.flow_types[0].date)
                  : selectedLog?.period_start_date
                  ? new Date(selectedLog.period_start_date)
                  : new Date()
              }
              className="custom-calendar"
              selectRange={false}
              showNeighboringMonth={true}
              tileClassName={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                // Add position-relative class to all tiles for proper dot positioning
                let classes = "position-relative m-1";

                // Check if it's a flow date
                const hasFlow = selectedLog?.flow_types?.some(
                  (f) => f.date === dateString
                );

                if (hasFlow) {
                  classes += " flow-date";
                }

                return classes;
              }}
              tileContent={({ date }) => {
                // Format date to YYYY-MM-DD without timezone issues
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const dateString = `${year}-${month}-${day}`;

                const flow = selectedLog?.flow_types?.find(
                  (f) => f.date === dateString
                );

                if (flow) {
                  return (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        right: "2px",
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#dc2626",
                        borderRadius: "50%",
                      }}
                    ></div>
                  );
                }
                return null;
              }}
            />
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
              <span className="text-sm">Period Flow Days</span>
            </div>
            <div
              className={`mt-3 grid md:grid-cols-${
                selectedLog?.flow_types?.length % 2 === 0 ? "2" : "3"
              } grid-cols-2 gap-2`}
            >
              {selectedLog?.flow_types?.map((flow) => (
                <div
                  key={flow.date}
                  className="mt-1 text-sm flex justify-start gap-2 col-span-1"
                >
                  <span>{moment(flow.date).format("MMM DD")}:</span>
                  <span className="font-semibold capitalize">
                    {flow.selectedFlow || "No Entry"}
                  </span>
                </div>
              ))}
            </div>

            {/* Add custom styles to fix all the issues */}
            <style jsx global>{`
              /* Fix weekend colors */
              .custom-calendar .react-calendar__month-view__days__day--weekend {
                color: black !important;
              }

              /* Basic tile styling */
              .custom-calendar .react-calendar__tile {
                margin: 2px;
                border-radius: 4px;
                position: relative !important;
                height: 40px;
                background: none;
              }

              /* Flow day styling */
              .custom-calendar .flow-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Reset today's special styling */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
              }

              /* Reset active/selected date styling */
              .custom-calendar .react-calendar__tile--active,
              .custom-calendar .react-calendar__tile--hasActive {
                background: inherit !important;
                color: inherit !important;
              }

              /* Apply flow styling even when active/hover */
              .custom-calendar .flow-date:hover,
              .custom-calendar .flow-date:focus,
              .custom-calendar .flow-date.react-calendar__tile--active {
                background-color: rgba(220, 38, 38, 0.25) !important;
              }

              .position-relative {
                position: relative !important;
              }

              /* Fix for Sunday display */
              .custom-calendar .react-calendar__month-view__days {
                display: grid !important;
                grid-template-columns: repeat(7, 1fr);
              }

              /* Ensure all days are visible */
              .custom-calendar .react-calendar__month-view__days__day {
                display: flex !important;
                justify-content: center;
                align-items: center;
              }

              /* Reset today's styling more aggressively */
              .custom-calendar .react-calendar__tile--now {
                background: inherit !important;
                color: inherit !important;
                border: none !important;
                outline: none !important;
              }

              /* Force fertility styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.fertile-date {
                background-color: rgba(168, 85, 247, 0.2) !important;
              }

              /* Force flow styles to override when on today's date */
              .custom-calendar .react-calendar__tile--now.flow-date {
                background-color: rgba(220, 38, 38, 0.15) !important;
              }

              /* Ensure dots remain visible on today's date */
              .custom-calendar .react-calendar__tile--now .dot-indicator {
                display: block !important;
              }
            `}</style>
          </div>
        </Modal>
      </div>
      {totalPages > 0 && (
        <div className="flex justify-between items-center m-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-slate-300">Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-700 dark:text-slate-300">entries</span>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default PeriodsTrackerPage;
