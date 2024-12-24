"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import PaginationNew from "@/components/ui/PaginationNew";
import Switch from "@/components/ui/Switch";
import Loading from "@/app/loading";

export default function RolesAndPermissions() {
  const [data, setData] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error, count } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact" })
        .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setData(data);
        setTotalPages(Math.ceil(count / pageSize));
      }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
   
    };

    fetchData();
  }, [pageIndex, pageSize]);

  const filteredData = data.filter((item) => {
    const searchText = (globalFilter || "").toLowerCase();
    return (
      (item.first_name || "").toLowerCase().includes(searchText) ||
      (item.last_name || "").toLowerCase().includes(searchText) ||
      (item.role || "").toLowerCase().includes(searchText) ||
      (item.email || "").toLowerCase().includes(searchText) ||
      (item.phone_number || "").toLowerCase().includes(searchText)
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
    const { error } = await supabase
      .from("user_profiles")
      .update({ is_deleted: true })
      .eq("id", id); // Use `.eq` to delete a specific item by its ID

    if (error) {
      console.error("Error deleting data:", error);
    } else {
      setData((prevData) => prevData.filter((item) => item.id !== id));
    }
  };

  const handleEdit = (id) => {
    router.push(`/admin/edit?id=${id}`);
  };

  const handleView = (id) => {
    router.push(`/admin/view?id=${id}`);
  };

  const toggleStatus = async (id, currentStatus) => {
    const { error } = await supabase
      .from("user_profiles")
      .update({ status: currentStatus ? false : true })
      .eq("id", id);

    if (error) {
      console.error("Error updating status:", error);
    } else {
      // Update local state to reflect the change
      setData((prevData) =>
        prevData.map((item) =>
          item.id === id
            ? { ...item, status: currentStatus ? false : true }
            : item
        )
      );
    }
  };

  return (
    <Card className="min-h-[80vh] bg-white">
      {loading && (
        <Loading />
      )}
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Roles & Permissions</h6>
        <div className="lg:space-x-3 sm:items-center justify-end flex max-sm:flex-col max-sm:justify-start max-lg:justify-between w-full max-lg:mt-5 rtl:space-x-reverse">
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          <div className="flex ">
            <Button
              icon="heroicons-outline:plus-sm"
              text="Register User Account"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => router.push("/admin/register-account")}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto  custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              {/* <div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2">Name</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Role</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Email</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Mobile No</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Created Date</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Status</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
            {filteredData.map((item) => (
              <tr
                key={item.id}
                className={`cursor-pointer capitalize ${
                  item.role !== "Admin" ? "hidden" : ""
                }`}
              >
                {/* <div onClick={() => handleView(item.id)} className="cursor-pointer"> */}
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap font-semibold text-secondary-800">
                  {item.first_name} <span>{item.last_name}</span>
                </td>
                <td className={`sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap `}>
                  {item.role === "Admin" ? "Admin" : " "}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap lowercase">
                  {item.email || "Null"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.phone_number}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {formatDate(item.created_at)}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  <Switch
                    value={item.status === true} // Assuming 'enabled' means the user can log in
                    onChange={() =>
                      toggleStatus(item.id, item.status === true)
                    }
                    activeClass="bg-green-500"
                    labelClass="-ml-2 mr-2 sm:text-sm text-xs text-gray-500"
                  />
                </td>

                {/* </div> */}
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <Button
                      icon="lets-icons:eye"
                      iconClass="text-base text-blue-500" // Adjust the color and size as needed
                      className="p-0 bg-transparent border-none text-center " // No padding, transparent background, no border
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item.id);
                      }}
                    />
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
