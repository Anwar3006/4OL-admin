"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/utils/supabaseClient";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDate } from "@/app/utils/helpers";
import PaginationNew from "@/components/ui/PaginationNew";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function UsersListing() {
  const [data, setData] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
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
    };

    fetchData();
  }, [pageIndex, pageSize]);

  const filteredData = data.filter((item) => {
    const searchText = (globalFilter || "").toLowerCase();
    return (
      (item.first_name || "").toLowerCase().includes(searchText) ||
      (item.last_name || "").toLowerCase().includes(searchText) ||
      (item.sex || "").toLowerCase().includes(searchText) ||
      (item.phone_number || "").toLowerCase().includes(searchText) ||
      (item.status || "").toLowerCase().includes(searchText)
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

  const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const downloadPDF = () => {
    const doc = new jsPDF();

    // Add Logo to the Right Side
    const logoUrl = "/assets/images/all-img/logo.png"; // Replace with your logo URL or base64 string
    const imgWidth = 12; // Width of the logo
    const imgHeight = 12; // Height of the logo
    const pageWidth = doc.internal.pageSize.getWidth(); // Page width
    const xPos = pageWidth - imgWidth - 10; // Position on the right
    const yPos = 10; // Position on the top
    doc.addImage(logoUrl, "PNG", xPos, yPos, imgWidth, imgHeight);

    // Title on the Left Side
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("List of Users", 14, 20); // Adjust x and y to align with the logo if needed

    // Table Headers
    const headers = [
      "Registration Date",
      "Name",
      "Sex",
      "Email",
      "Phone Number",
      "Last Activity Date",
      "Status",
    ];

    const tableData = data.map((item) => [
      capitalizeFirstLetter(formatDate(item.created_at) || "N/A"),
      capitalizeFirstLetter(`${item.first_name || ""} ${item.last_name || ""}`),
      capitalizeFirstLetter(item.sex || "N/A"),
      item.email.toLowerCase() || "N/A",
      capitalizeFirstLetter(item.phone_number || "N/A"),
      capitalizeFirstLetter(formatDate(item.last_activity) || "N/A"),
      item.status === true ? "Active" : "Inactive", // Ensure status is capitalized
    ]);

    // Add Table to PDF
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 40, // Adjust to start below the logo
      headStyles: {
        fillColor: [86, 206, 132], // RGB color for the header background (e.g., #56ce84)
        textColor: [255, 255, 255], // Optional: Set text color to white
        fontSize: 10, // Optional: Set font size for header text
      },
    });

    // Save the PDF
    doc.save("users_list.pdf");
  };

  const handleView = (id) => {
    router.push(`/users/view?id=${id}&from=users`);
  };

  return (
    <>
    <Card className="bg-white" bodyClass="p-0 dark:bg-slate-800" title={"Users"}>

      <div className="overflow-x-auto custom-scrollbar relative -mt-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-medium text-gray-500 uppercase">
              {/* <div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2">Registration Date</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Name</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Sex</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Email</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Phone Number</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Last Activity Date</th>
              <th className="sm:px-6 px-2 sm:py-3 py-2">Status</th>
              {/* </div> */}
              <th className="sm:px-6 px-2 sm:py-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white sm:text-sm divide-y divide-gray-200 text-xs">
            {filteredData.map((item) => (
              <tr
                // key={item.id} onClick={() => handleView(item.id)}
                className="cursor-pointer capitalize"
              >
                {/* <div onClick={() => handleView(item.id)} className="cursor-pointer"> */}
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.created_at
                    ? formatDate(item.created_at)
                    : "Not Available"}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.first_name} {item.last_name}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.sex}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap lowercase">
                  {item.email}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.phone_number}
                </td>
                <td className="sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap">
                  {item.last_activity
                    ? formatDate(item.last_activity)
                    : "No Activity"}
                </td>
                <td className={`sm:px-6 px-2 sm:py-4 py-2 whitespace-nowrap`}>
                  {item.status === true ? (
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      <span className="">Inactive</span>
                    </div>
                  )}
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
                      icon="heroicons-outline:download"
                      iconClass="text-base text-green-500" // Adjust the color and size as needed
                      className="p-0 bg-transparent border-none text-center " // No padding, transparent background, no border
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadPDF();
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="m-4 flex justify-end items-end">
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
    </>
  );
}
