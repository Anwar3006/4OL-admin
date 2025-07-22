"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PaginationNew from "@/components/ui/PaginationNew";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { toast, ToastContainer } from "react-toastify";
import Loading from "@/components/Loading";

export default function DeleteUserAccountListing() {
  const [data, setData] = useState([]); // State to hold fetched data
  const [globalFilter, setGlobalFilter] = useState(""); // Search filter
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize] = useState(10); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const router = useRouter();
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role");
      setUserRole(role);
    }
  }, []);

  // Fetch data from Supabase on component mount and when page changes
  const fetchData = async () => {
    setLoading(true);
    try {

      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;
  
      const {
        data: fetchedData,
        error,
        count,
      } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact" })
        .eq("delete_account_request", true)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false })
        .range(from, to);
  
      if (error) {
        console.error("Error fetching data:", error);
        return;
      }
  
      setData(fetchedData || []);
      setTotalPages(Math.ceil(count / pageSize));
      
    } catch (error) {
      console.error("Error fetching data:", error);
      
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [pageIndex, pageSize]);

  // Filter logic for the global search
  const filteredData = data
    .filter((item) => {
      const searchText = (globalFilter || "").toLowerCase();
      return (
        item.first_name?.toLowerCase().includes(searchText) ||
        item.last_name?.toLowerCase().includes(searchText) ||
        item.email?.toLowerCase().includes(searchText) ||
        item.phone_number?.toLowerCase().includes(searchText)
      );
    })
    .sort((a, b) => {
      if (
        a.delete_account_request === "true" &&
        b.delete_account_request !== "true"
      )
        return -1;
      if (
        a.delete_account_request !== "true" &&
        b.delete_account_request === "true"
      )
        return 1;
      return 0;
    });

  // Pagination controls
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (index) => setPageIndex(index);
  const previousPage = () => canPreviousPage && setPageIndex(pageIndex - 1);
  const nextPage = () => canNextPage && setPageIndex(pageIndex + 1);

  const handleView = (id) => {
    router.push(`users/view?id=${id}`);
  };

  const handleDeleteAccountStatusChange = async (newStatus, user) => {
    if (newStatus === "Approved") {
      const { error } = await supabase
        .from("user_profiles")
        .update({ is_deleted: true })
        .eq("id", user.id);

      if (error) {
        console.error("Failed to update user deletion status:", error);
        toast.error("Failed to update deletion status");
        return;
      }

      // Update state locally
      setData((prevData) =>
        prevData.map((item) =>
          item.id === user.id
            ? { ...item, is_deleted: true, delete_account_request: false }
            : item
        )
      );

      toast.success("User Delete Account Request Approved");
      fetchData(); // Refresh data after update
    }
  };

  return (
    <Card className="relative bg-white min-h-[70vh] mt-5" bodyClass="p-0">
      <ToastContainer />

      <div className="flex max-lg:flex-col items-center w-full p-6">
        <h6 className="md:mb-0 mb-3 w-full">Delete User Account Requests</h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-0 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
        </div>
      </div>

      <div className="overflow-x-auto  flex-1 px-2 custom-scrollbar">
      {loading && (
        <div>
          <div className="flex justify-center items-center h-screen">
            <Loading />
          </div>
        </div>
      )}
        {filteredData.length === 0 ? (
          <div className="text-center py-6 text-gray-500 min-h-[50vh] justify-items-center align-middle">
            <p className="text-lg font-semibold">No Request Found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Sex</th>
                <th className="px-6 py-3">Contact No</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 text-xs">
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-gray-50 whitespace-nowrap"
                >
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                    {item.first_name + " " + item.last_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                    {item.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.sex}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.phone_number}
                  </td>

                  <td className=" py-2 text-left">
                    {userRole === "Super Admin" ? (
                      <CustomDropdown
                        options={["Pending", "Approved"]}
                        selectedValue={
                          item.delete_account_request === true
                            ? "Pending"
                            : "Approved"
                        }
                        onChange={(newStatus) =>
                          handleDeleteAccountStatusChange(newStatus, item)
                        }
                      />
                    ) : (
                      <span
                        className={`text-center ${
                          item.delete_account_request === true
                            ? "text-green-500 text-center"
                            : "text-yellow-500 text-center"
                        }`}
                      >
                        {item.delete_account_request === true
                            ? "Pending"
                            : "Approved"}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-2">
                    <div className="flex space-x-2 items-center justify-center">
                      <Button
                        icon="lets-icons:eye"
                        iconClass="text-lg"
                        className="p-0 bg-transparent font-medium text-blue-500 border-none hover:text-green-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(item.id);
                        }}
                        text={"View"}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-end p-4 border-t bg-white w-full z-10">
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
