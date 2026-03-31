"use client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchFacilityRatings } from "@/app/services/fetchFacilityRatings";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Loading from "@/app/loading";
import { DataTable } from "@/components/Data-Table/data-table";
import { reviewColumns } from "@/components/Data-Table/columns/reviewColumns";
import { reviewCardConfig } from "@/components/Data-Table/mobile-table-configs/reviewCardConfig";

const Reviews = () => {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(1); // DataTable uses 1-based index
  const [pageSize] = useState(13); // Items per page
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const router = useRouter();

  const fetchRatings = useCallback(async () => {
    setLoading(true);
    try {
      const from = (pageIndex - 1) * pageSize;
      const to = from + pageSize - 1;
      const { ratings, count } = await fetchFacilityRatings(from, to, debouncedSearch);
      setRatings(ratings || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Failed to fetch ratings", error);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, debouncedSearch]);

  const onSearchChange = (e) => {
    setSearch(e.target.value);
    setPageIndex(1);
  };

  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const pagination = useMemo(() => ({
    currentPage: pageIndex,
    totalPages: totalPages,
    totalItems: totalCount,
    pageSize: pageSize,
    onPageChange: (page) => setPageIndex(page),
    onNextPage: () => setPageIndex((prev) => Math.min(prev + 1, totalPages)),
    onPreviousPage: () => setPageIndex((prev) => Math.max(prev - 1, 1)),
    canNextPage: pageIndex < totalPages,
    canPreviousPage: pageIndex > 1,
  }), [pageIndex, totalPages, totalCount, pageSize]);

  const handleRowClick = useCallback((row) => {
    router.push(`/view-reviews?id=${row.id}`);
  }, [router]);

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
    const logoUrl = "/assets/images/all-img/logo.png";
    const imgWidth = 12;
    const imgHeight = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const xPos = pageWidth - imgWidth - 10;
    const yPos = 10;
    doc.addImage(logoUrl, "PNG", xPos, yPos, imgWidth, imgHeight);

    // Title on the Left Side
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Reviews", 14, 20);

    // Table Headers
    const headers = [
      "Reviewer",
      "Facility Name",
      "Comments",
      "Ratings",
      "Date",
    ];

    const tableData = ratings.map((item) => [
      capitalizeFirstLetter(item.user_profiles?.name || "Anonymous"),
      capitalizeFirstLetter(item.facility_profile?.facility_name || "N/A"),
      item.comment_text || "N/A",
      item.rating || 0,
      item.created_at ? new Date(item.created_at).toLocaleDateString() : "N/A",
    ]);

    // Add Table to PDF
    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 40,
      headStyles: {
        fillColor: [86, 206, 132],
        textColor: [255, 255, 255],
        fontSize: 10,
      },
    });

    // Save the PDF
    doc.save("Reviews.pdf");
  };

  return (
    <Card
      className="min-h-[70vh] mt-5"
      bodyClass="p-4"
      title="Reviews"
      headerslot={
        <Button
          icon="heroicons-outline:download"
          iconClass="text-white text-lg"
          className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
          onClick={(e) => {
            e.stopPropagation();
            downloadPDF();
          }}
        />
      }
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by comments or facility..."
            className="pl-9"
            value={search}
            onChange={onSearchChange}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <DataTable
        columns={reviewColumns}
        data={ratings}
        pagination={pagination}
        isLoading={loading}
        cardConfig={reviewCardConfig}
        onRowClick={handleRowClick}
      />
    </Card>
  );
};

export default Reviews;
