"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { fetchFacilityRatings } from "@/app/services/fetchFacilityRatings";
import { useRouter } from "next/navigation";
import PaginationNew from "@/components/ui/PaginationNew";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Rating from "react-rating";
import Loading from "@/app/loading";
import NoDataFound from "@/components/NoDataFound";

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

  if (loading) return <Loading />;

  return (
    <Card
      className="min-h-[70vh]  mt-5"
      bodyClass="p-0"
      title="Reviews"
      headerslot={
        <>
          {" "}
          <Button
            icon="heroicons-outline:download"
            iconClass="text-white text-lg"
            className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
            // text="Download PDF"
            onClick={(e) => {
              e.stopPropagation();
              downloadPDF();
            }}
          />
        </>
      }
    >
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr className="text-left  text-xs font-medium text-gray-500 dark:text-slate-200 uppercase">
              <th className="px-6 py-3">Full Name</th>
              <th className="px-6 py-3">Facility name</th>
              <th className="px-6 py-3">Comments</th>
              <th className="px-6 py-3 text-center">Rating</th>
              {/* <th className="px-4 py-3">Medication Type</th> */}
              <th className="px-6 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {ratings.length === 0 && !loading && (
              <tr>
                <td colSpan="5" className="text-center py-10">
                  <NoDataFound />
                </td>
              </tr>
            )}
            {ratings.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 border-b text-sm border-gray-100"
              >
                <td className="px-6 py-3 capitalize">
                  {item.first_name || "N/A"} {item.last_name || "N/A"}
                </td>
                <td className="px-6 py-3 capitalize">
                  {item.facility_name || "Ali"}
                </td>
                <td className="px-6 py-3 capitalize">
                  {item.comment || "N/A"}
                </td>
                <td className="px-6 py-3 text-center">
                  <Rating
                    fractions={2}
                    initialRating={item.rating}
                    onChange={(value) => handleUpdateRating(value, item.id)}
                    emptySymbol={
                      <span style={{ color: "#ccc", fontSize: "1.5rem" }}>
                        ☆
                      </span>
                    }
                    fullSymbol={
                      <span style={{ color: "#ffc107", fontSize: "1.5rem" }}>
                        ★
                      </span>
                    }
                  />
                </td>
                <td className="px-6 py-3">
                  <div className="text-center">
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
      <div className="m-4 flex justify-end">
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
