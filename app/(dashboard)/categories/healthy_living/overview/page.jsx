"use client";
import {
  deleteHealthyLivingEntry,
  getAllHealthyLivingEntries,
} from "@/app/services/healthy-living-service";
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const HealthyLivingOverviewPage = () => {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchArticles();
  }, [currentPage]);

  const fetchArticles = async () => {
    try {
      const data = await getAllHealthyLivingEntries();
      if (data) {
        setArticles(data);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching healthy living articles:", error);
      toast.error("Failed to load articles");
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
    const encodedItem = encodeURIComponent(JSON.stringify(item));
    router.push(`/categories/healthy_living/form?healthyliving=${encodedItem}`);
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
    return articles.slice(startIndex, endIndex);
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
      <Card
        title="Healthy Living Articles"
        className="bg-white dark:bg-slate-800 overflow-hidden relative"
        bodyClass="p-0"
      >
        <div className="flex justify-end p-4 absolute top-2 right-2">
          <Button
            text="Add New Article"
            className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
            iconClass="text-lg"
            onClick={() => router.push("/categories/healthy_living/form")}
          />
        </div>
        <div ref={scrollContainerRef} className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Topic Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  About
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  More Information
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                  Attribution
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getCurrentPageData().map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {article.topic_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[250px] truncate">
                    {truncateText(article.about)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {article.category}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                    {truncateText(article.more_information)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                    {article.attribution}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        icon="lets-icons:eye"
                        iconClass="text-blue-500 text-lg"
                        className="p-0 bg-transparent border-none"
                        onClick={() => handleView(article)}
                        tooltip="View Details"
                      />
                      <Button
                        icon="heroicons-outline:pencil-alt"
                        iconClass="text-green-500 text-lg"
                        className="p-0 bg-transparent border-none"
                        onClick={() => handleEdit(article)}
                        tooltip="Edit"
                      />
                      <Button
                        icon="heroicons-outline:trash"
                        iconClass="text-red-500 text-lg"
                        className="p-0 bg-transparent border-none"
                        onClick={() => deleteModal(article)}
                        tooltip="Delete"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No healthy living articles found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 0 && (
          <div className="flex justify-end items-center m-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
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
                          <img
                            src={value}
                            alt="image url"
                            className="w-16 h-16 object-cover rounded-sm"
                          />
                        </a>
                      </p>
                    </div>
                  );
                }

                return (
                  <div key={key} className="flex">
                    <div className="w-1/3 text-gray-900">{label}</div>
                    <p className="w-2/3">{value || "-"}</p>
                  </div>
                );
              })}

              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <Button
                  text="Close"
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setViewDetails(null);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default HealthyLivingOverviewPage;
