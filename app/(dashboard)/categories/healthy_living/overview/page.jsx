"use client";
import {
  deleteHealthyLivingEntry,
  getAllHealthyLivingEntries,
} from "@/app/services/healthy-living-service";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import NoDataFound from "@/components/NoDataFound";
import Loading from "@/components/Loading";

const HealthyLivingOverviewPage = () => {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const searchRef = useRef(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchArticles();
  }, [currentPage]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = await getAllHealthyLivingEntries();
      if (data) {
        setArticles(data);
      }
    } catch (error) {
      console.error("Error fetching healthy living articles:", error);
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  // Handle search filtering
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredArticles([]);
      setShowDropdown(false);
    } else {
      const filtered = articles.filter((article) =>
        article.headline?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredArticles(filtered);
      setShowDropdown(true);
    }
  }, [searchQuery, articles]);

  // Update total pages based on search results
  useEffect(() => {
    const dataToDisplay = searchQuery && filteredArticles.length > 0
      ? filteredArticles
      : articles;
    setTotalPages(Math.ceil(dataToDisplay.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when items per page changes
  }, [articles, filteredArticles, searchQuery, itemsPerPage]);

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

  const handleSelectArticle = (article) => {
    setSearchQuery(article.headline);
    setShowDropdown(false);
    // Scroll to the article in the table
    const articleIndex = articles.findIndex((a) => a.id === article.id);
    if (articleIndex !== -1) {
      const pageNumber = Math.floor(articleIndex / itemsPerPage) + 1;
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
      }, 300);
    };

    container.addEventListener("scroll", onScroll);
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, []);

  const handleEdit = (item) => {
    // router.push(`/categories/healthy_living/form?healthyliving=${encodedItem}`);
    router.push(`/categories/healthy_living/form?id=${item.id}`);
  };

  const handleViewDetails = (item) => {
    router.push(`/categories/healthy_living/details?id=${item.id}`);
  };

  const handleView = (item) => {
    setViewDetails(item);
    setShowDetailsModal(true);
  };

  const deleteModal = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const deleteItem = async (id) => {
    try {
      await deleteHealthyLivingEntry(id);
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchArticles();
      toast.success("Article deleted successfully");
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Failed to delete article");
    }
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dataToDisplay = searchQuery && filteredArticles.length > 0
      ? filteredArticles
      : articles;
    return dataToDisplay.slice(startIndex, endIndex);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  const fields = [
    { label: "Image", key: "image_url", type: "image" },
    { label: "About", key: "about" },
    { label: "Category", key: "category" },
    { label: "Contact your Doctor", key: "contact_your_doctor" },
    { label: "More Information", key: "more_information" },
    { label: "Attribution", key: "attribution" },
  ];

  return (
    <div className="mt-5 relative">
      <Card className="overflow-hidden relative">
        <CardHeader className="flex flex-row justify-between items-center bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 p-6">
          <CardTitle>Healthy Living Articles</CardTitle>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowDropdown(true)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200 w-64"
                />
              </div>
              {/* Autocomplete Dropdown */}
              {showDropdown && filteredArticles.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredArticles.map((article) => (
                    <div
                      key={article.id}
                      onClick={() => handleSelectArticle(article)}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-900 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                    >
                      {article.headline}
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && searchQuery && filteredArticles.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg">
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
                    No results found
                  </div>
                </div>
              )}
            </div>
            <Button
              className="max-sm:text-xs font-normal btn-sm h-8"
              variant="default"
              onClick={() => router.push("/categories/healthy_living/form")}
            >
              <Icon icon="heroicons-outline:plus" className="text-lg mr-2" />
              Add New Article
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
        <div ref={scrollContainerRef} className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Topic Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  About
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  More Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Attribution
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200">
              {getCurrentPageData().map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <td className="px-6 py-4 text-sm align-top">
                    <button
                      onClick={() => handleViewDetails(article)}
                      className="text-secondary-800 dark:text-green-400 hover:text-secondary-600 dark:hover:text-green-300 hover:underline text-left font-medium"
                    >
                      {article.topic_name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-200 max-w-[250px] align-top">
                    <HtmlRenderer htmlContent={article.about} maxLength={100} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-200 max-w-[200px] align-top">
                    <HtmlRenderer
                      htmlContent={article.category}
                      maxLength={80}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-200 max-w-[200px] align-top">
                    <HtmlRenderer
                      htmlContent={article.more_information}
                      maxLength={100}
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-200 max-w-[150px] truncate align-top">
                    {article.attribution}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-200 align-top">
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0 bg-transparent border-none text-green-500 hover:text-green-600 hover:bg-green-50"
                        onClick={() => handleEdit(article)}
                        title="Edit"
                      >
                        <Icon icon="heroicons-outline:pencil-alt" className="text-lg" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0 bg-transparent border-none text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteModal(article)}
                        title="Delete"
                      >
                        <Icon icon="heroicons-outline:trash" className="text-lg" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500 dark:text-slate-200"
                  >
                    <Loading />
                  </td>
                </tr>
              )}
              {articles.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500 dark:text-slate-200"
                  >
                    <NoDataFound />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              handlePageChange={setCurrentPage}
            />
          </div>
        )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Article"
        titleClass="text-white text-lg"
        activeModal={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        centered
        themeClass="bg-red-500"
        className="sm:max-w-[70vw] max-w-[90vw]"
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
              Are you sure you want to delete <br />
              <span className="font-semibold">
                "{itemToDelete?.topic_name}"
              </span>
              ?
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

      {/* Details Modal */}
      <Modal
        title={
          viewDetails?.topic_name + " Detailed Summary" || "Article Details"
        }
        titleClass="text-lg font-semibold text-white"
        activeModal={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setViewDetails(null);
        }}
        centered
        themeClass="bg-[#4ab573]"
        size="lg"
      >
        <div
          style={{ scrollbarWidth: 0 }}
          className="lg:max-h-[80vh] max-h-[95vh] overflow-y-auto hidden-scrollbar sm:text-sm text-xs text-gray-600 w-full"
        >
          {viewDetails && (
            <div className="grid grid-cols-1 gap-2 capitalize">
              {fields.map(({ label, key, type, fields: subFields }) => {
                const value = viewDetails[key];

                if (!value) return null;

                if (type === "image") {
                  return (
                    <div key={key} className="flex">
                      <div className="w-1/3 text-gray-900">{label}</div>
                      <p className="w-2/3">
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Image
                            src={value}
                            alt="image url"
                            width={64}
                            height={64}
                            unoptimized
                            className="w-16 h-16 object-cover rounded-sm"
                          />
                        </a>
                      </p>
                    </div>
                  );
                }

                // Check if this field should be rendered as HTML
                const richTextFields = [
                  "about",
                  "category",
                  "contact_your_doctor",
                  "more_information",
                ];
                const shouldRenderAsHtml = richTextFields.includes(key);

                return (
                  <div key={key} className="flex">
                    <div className="w-1/3 text-gray-900">{label}</div>
                    <div className="w-2/3">
                      {shouldRenderAsHtml ? (
                        <HtmlRenderer htmlContent={value || "-"} />
                      ) : (
                        <p>{value || "-"}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <Button
                  className="px-4 py-2"
                  variant="secondary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewDetails(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default HealthyLivingOverviewPage;
