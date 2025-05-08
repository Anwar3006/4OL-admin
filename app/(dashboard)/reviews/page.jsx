"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { fetchFacilityRatings } from "@/app/services/fetchFacilityRatings";
import { useRouter } from "next/navigation";
import PaginationNew from "@/components/ui/PaginationNew";
import jsPDF from "jspdf";
import "jspdf-autotable";

const Reviews = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0); // Pagination index
  const [pageSize] = useState(13); // Items per page
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination
  const router = useRouter();

  useEffect(() => {
    const getRatings = async () => {
      try {
        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;
        const { ratings, count } = await fetchFacilityRatings(from, to);
        setRatings(ratings || []);
        setTotalPages(Math.ceil(count / pageSize));
      } catch (error) {
        console.error("Failed to fetch ratings", error);
      } finally {
        setLoading(false);
      }
    };
    getRatings();
  }, [pageIndex, pageSize]);

  const pageOptions = Array.from({ length: totalPages }, (_, i) => i);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageOptions.length - 1;

  const gotoPage = (index) => setPageIndex(index);
  const previousPage = () => canPreviousPage && setPageIndex(pageIndex - 1);
  const nextPage = () => canNextPage && setPageIndex(pageIndex + 1);

  const handleView = (id) => {
    router.push(`/view-reviews?id=${id}`);
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
    doc.text("Reviews", 14, 20); // Adjust x and y to align with the logo if needed

    // Table Headers
    const headers = [
      "First Name",
      "Last Name",
      "Facility Name",
      "Comments",
      "Ratings",
    ];

    const tableData = ratings.map((item) => [
      capitalizeFirstLetter(`${item.first_name || ""}`),
      capitalizeFirstLetter(`${item.last_name || ""}`),
      capitalizeFirstLetter(item.facility_name || "N/A"),
      capitalizeFirstLetter(item.comment || "N/A"),
      item.rating || 2,
      // item.end_date ? item.end_date.slice(0, 10) : "N/A",
      // capitalizeFirstLetter(item.medication_amount || "N/A"),
      // capitalizeFirstLetter(item.medication_dose || "N/A"),
      // item.intake_amount || "N/A", // Ensure status is capitalized
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
    doc.save("Reviews.pdf");
  };

  if (loading)
    return (
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
    );

  return (
    <Card className="min-h-[80vh] bg-white">
      <div className="flex max-lg:flex-col pb-6 items-center w-full">
        <h6 className="md:mb-0 mb-3 w-full">Reviews</h6>
        <Button
          icon="heroicons-outline:download"
          iconClass="text-white text-xl"
          className="p-2 bg-green-500 border-none"
          onClick={(e) => {
            e.stopPropagation();
            downloadPDF();
          }}
        />
      </div>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left sm:text-sm text-xs font-medium text-gray-500">
              <th className="px-4 py-3">First name</th>
              <th className="px-4 py-3">Last name</th>
              <th className="px-4 py-3">Facility name</th>
              <th className="px-4 py-3">Comments</th>
              <th className="px-4 py-3">Rating</th>
              {/* <th className="px-4 py-3">Medication Type</th> */}
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {ratings.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer hover:bg-gray-50 border-b border-gray-100"
              >
                <td className="px-4 py-2 capitalize">
                  {item.first_name || "Ali"}
                </td>
                <td className="px-4 py-2 capitalize">
                  {item.last_name || "Hassan"}
                </td>
                <td className="px-4 py-2 capitalize">
                  {item.facility_name || "Ali"}
                </td>
                <td className="px-4 py-2 capitalize">
                  {item.comment || "Hello"}
                </td>
                <td className="px-4 py-2 capitalize">{item.rating || "2"}</td>
                <td className="px-4 py-2">
                  <div className="">
                    <Button
                      icon="lets-icons:eye"
                      iconClass="text-blue-500 text-xl"
                      className="p-1 bg-transparent border-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleView(item.id);
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
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

export default Reviews;
