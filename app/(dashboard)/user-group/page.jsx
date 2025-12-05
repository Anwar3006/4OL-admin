"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import NoDataFound from "@/components/NoDataFound";

export default function UserGroups() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [data, setData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modal, setModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loader, setLoader] = useState(false);
  const [notificationId, setNotificationId] = useState(null);
  const router = useRouter();

  const fetchData = async () => {
    const from = pageIndex * pageSize;
    const to = from + pageSize - 1;
    try {
      const {
        data: notificationData,
        error,
        count,
      } = await supabase
        .from("notification_list")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) {
        console.error(error);
      } else {
        setData(notificationData);
        setTotalPages(Math.ceil(count / pageSize));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageIndex, pageSize]);

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

  const handleView = (id) => {
    router.push(`view-notification?id=${id}`);
  };

  const handleEdit = (id) => {
    router.push(`/send-notifications?id=${id}`);
  };

  const handleDelete = async (id) => {
    setLoader(true);
    try {
      const { error } = await supabase
        .from("notification_list")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Error deleting notification record", error);
      }
      setData((prev) => prev.filter((item) => item.id !== id));
      setShowModal(false);
      toast.success("Notification deleted successfully");
      setSelectedId(null);
      await fetchData();
    } catch (error) {
      console.error("Error deleting notification record", error);
    } finally {
      setLoader(false);
    }
  };

  const openModal = (id) => {
    setShowModal(true);
    setSelectedId(id);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedId(null);
  };

  const closeNotificationModal = () => {
    setModal(false);
    setNotificationId(null);
  };

  const openNotificationModal = (id) => {
    setModal(true);
    setNotificationId(id);
  };

  const handleResendNotification = async (id) => {
    setLoader(true);
    try {
      const { data, error } = await supabase
        .from("notification_list")
        .select("title, description, region, sex, age_range")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching notification data", error);
      }

      await fetch("/api/send-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data?.title,
          description: data?.description,
          sex: data?.sex,
          ageRange: data?.age_range,
          region: data?.region,
        }),
      });
      setModal(false);
      toast.success("Notification sent successfully");
    } catch (error) {
      console.error("Error fetching notification data", error);
    } finally {
      setLoader(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  return (
    <Card className="min-h-[70vh] mt-5" bodyClass="p-0">
      <div className="flex max-lg:flex-col p-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">User Group</h6>
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

      <div className="overflow-x-auto  custom-scrollbar relative -mt-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-800 w-full">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase">
              <th className="sm:px-6 px-2 sm:py-3 py-2">Title</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Description</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Region</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Sex</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Age Range</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 dark:text-slate-200 sm:text-sm divide-y divide-gray-200 text-xs capitalize">

            {data.length === 0 && (
              <tr>
                <td colspan="6">
                  <NoDataFound />
                </td>
              </tr>
            )}
            {data.map((item) => (
              <tr key={item.id} className="cursor-pointer">
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.title || "Null"}
                  <p className="text-xs">
                    {item.created_at
                      ? new Date(item.created_at).toDateString()
                      : "null"}
                  </p>
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.description || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.region || "Ahafo"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.sex || "Male"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.age_range || "18-24"}
                </td>
                <td className="text-center">
                  <div className="flex justify-center items-center gap-2">
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
                      icon="fluent:arrow-clockwise-20-filled"
                      iconClass="text-yellow-500 text-lg"
                      className="p-0 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNotificationModal(item.id);
                      }}
                    />
                    <Button
                      icon="heroicons-outline:trash"
                      iconClass="text-red-500 text-lg"
                      className="p-0 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        openModal(item.id);
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 border-4 border-gray-600">
            <div className="bg-black-200 p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
              <p className="mb-6">
                Are you sure you want to delete this notification?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-white rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedId && handleDelete(selectedId)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 text-sm"
                  disabled={loader}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {modal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 border-4 border-gray-600">
            <div className="bg-black-200 p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4">
                Confirm Send Notification
              </h2>
              <p className="mb-6">
                Are you sure you want to resend this notification?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeNotificationModal}
                  className="px-4 py-2 bg-white rounded hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    notificationId && handleResendNotification(notificationId)
                  }
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 text-sm"
                  disabled={loader}
                >
                  {loader ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  ) : (
                    "OK"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
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
