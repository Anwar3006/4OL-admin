"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { supabase } from "@/app/utils/supabaseClient";
import { useEffect, useState, useRef } from "react";
import Loading from "@/components/Loading";
import PaginationNew from "@/components/ui/PaginationNew";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";
import NoDataFound from "@/components/NoDataFound";
import { Icon } from "@iconify/react";

const pillReminder = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize, setPageSize] = useState(10); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [allData, setAllData] = useState([]); // Store all data for searching
  const searchRef = useRef(null);

  const fetchMedicationReminders = async () => {
    try {
      const from = pageIndex * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from("medication_reminders")
        .select("*, user_profiles (first_name, last_name)", { count: "exact" })
        .range(from, to);

      if (error) {
        console.error("Error fetching medication reminders", error);
      }

      setData(data || []);
      setTotalPages(Math.ceil(count / pageSize));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all data for search
  const fetchAllData = async () => {
    try {
      const { data, error } = await supabase
        .from("medication_reminders")
        .select("*, user_profiles (first_name, last_name)");

      if (error) {
        console.error("Error fetching all medication reminders", error);
      }

      setAllData(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMedicationReminders();
    fetchAllData();
  }, [pageIndex, pageSize]);

  // Handle search filtering
  const filteredData = allData.filter((item) =>
    item.medication_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user_profiles?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.user_profiles?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleSelectMedication = (medication) => {
    setSearchQuery(medication.medication_name);
    setShowDropdown(false);
    // Navigate to view details
    handleView(medication.id);
  };

  // Pagination controls
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (index) => setPageIndex(index);
  const previousPage = () => canPreviousPage && setPageIndex(pageIndex - 1);
  const nextPage = () => canNextPage && setPageIndex(pageIndex + 1);

  const handleView = (id) => {
    router.push(`/view-medication-reminder-details?id=${id}`);
  };

  const capitalizeFirstLetter = (str) => {
    if (!str) return str;
    const safeStr = String(str);
    return safeStr
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });

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
    doc.text("Medication Reminders", 14, 20); // Adjust x and y to align with the logo if needed

    // Table Headers
    const headers = [
      "Full Name",
      "Medication Name",
      "Medication Type",
      "Condition",
      "Start Date",
      "End Date",
      "Amount",
      "Dose",
      "Number of Times",
    ];

    const tableData = data.map((item) => [
      capitalizeFirstLetter(
        `${item.user_profiles.first_name || ""} ${
          item.user_profiles.last_name || ""
        }`
      ),
      capitalizeFirstLetter(item.medication_name || "N/A"),
      capitalizeFirstLetter(item.medication_type || "N/A"),
      capitalizeFirstLetter(item.condition || "Critical"),
      item.start_date ? item.start_date.slice(0, 10) : "N/A",
      item.end_date ? item.end_date.slice(0, 10) : "N/A",
      capitalizeFirstLetter(item.medication_amount || "N/A"),
      capitalizeFirstLetter(item.medication_dose || "N/A"),
      item.intake_amount || "N/A", // Ensure status is capitalized
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
      columnStyles: {
        6: { halign: "center" }, // "Amount"
        8: { halign: "center" }, // "Number of Times"
      },
    });

    // Save the PDF
    doc.save("Medication_reminder.pdf");
  };

  if (loading) {
    return (
      <div>
        <Loading />
      </div>
    );
  }
  return (
    <Card
      className="min-h-[70vh] bg-white mt-8"
      bodyClass="p-0"
      title={"Medication Reminder"}
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
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery && setShowDropdown(true)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200 w-64"
              />
            </div>
            {/* Autocomplete Dropdown */}
            {showDropdown && filteredData.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredData.slice(0, 10).map((medication) => (
                  <div
                    key={medication.id}
                    onClick={() => handleSelectMedication(medication)}
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-900 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                  >
                    <div>{medication.medication_name}</div>
                    <div className="text-xs text-gray-500">
                      {medication.user_profiles?.first_name} {medication.user_profiles?.last_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showDropdown && searchQuery && filteredData.length === 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg">
                <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
                  No results found
                </div>
              </div>
            )}
          </div>
          {" "}
          <Button
            icon="heroicons-outline:download"
            iconClass="text-white text-lg"
            // text="Download PDF"
            className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
            onClick={(e) => {
              e.stopPropagation();
              downloadPDF();
            }}
          />
        </div>
      }
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 whitespace-nowrap dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-slate-200 uppercase whitespace-nowrap">
              <th className="px-6 py-3">Full Name</th>
              {/* <th className=6 px-4 py-3">Date</th> */}
              <th className="px-6 py-3">Medication name</th>
              <th className="px-6 py-3">Condition</th>
              <th className="px-6 py-3">Medication Type</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-xs sm:text-sm dark:bg-slate-800 dark:divide-slate-700">
            {data.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="text-center py-10 text-base text-gray-500 dark:text-slate-200"
                >
                  <NoDataFound />
                </td>
              </tr>
            )}
            {data.map((item) => (
              <tr className="cursor-pointer hover:bg-gray-50 text-sm dark:hover:bg-slate-700">
                <td className="px-6 py-4 capitalize">
                  {item.user_profiles.first_name || "Ali"}{" "}
                  {item.user_profiles.last_name || "Hassan"}
                </td>
                {/* <td className="px-4 py-2 capitalize">5-5-2025</td> */}
                <td className="px-6 py-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleView(item.id);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-left font-medium capitalize"
                  >
                    {item.medication_name || "Cosmelon"}
                  </button>
                </td>
                <td className="px-6 py-4 capitalize">{item.condition}</td>
                <td className="px-6 py-4 capitalize">
                  {item.medication_type || "Antibiotic"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 dark:text-slate-300">Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPageIndex(0); // Reset to first page
            }}
            className="border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700 dark:text-slate-300">entries</span>
        </div>
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
};

export default pillReminder;
