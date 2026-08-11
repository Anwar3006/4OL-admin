"use client";
import { deleteDisease, getAllDiseases } from "@/app/services/diseases-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import HtmlRenderer from "@/components/ui/HtmlRenderer";
import Loading from "@/components/Loading";
import NoDataFound from "@/components/NoDataFound";

const IllnessAndComplicationsPage = () => {
  const router = useRouter();
  const [conditions, setConditions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredConditions, setFilteredConditions] = useState([]);
  const searchRef = useRef(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchConditions();
  }, [currentPage]);

  const fetchConditions = async () => {
    setLoading(true);
    try {
      const data = await getAllDiseases();
      if (data) {
        setConditions(data);
      }
    } catch (error) {
      console.error("Error fetching conditions:", error);
      toast.error("Failed to load conditions");
    } finally {
      setLoading(false);
    }
  };

  // Update total pages based on search results
  useEffect(() => {
    const dataToDisplay = searchQuery && filteredConditions.length > 0
      ? filteredConditions
      : conditions;
    setTotalPages(Math.ceil(dataToDisplay.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when items per page changes
  }, [conditions, filteredConditions, searchQuery, itemsPerPage]);

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

  // const handleEdit = (item) => {
  //   const encodedItem = encodeURIComponent(JSON.stringify(item));
  //   console.log(encodedItem);
  //   router.push(
  //     `/categories/illness_and_complications/form?disease=${encodedItem}`
  //   );
  // };

  const handleEdit = (item) => {
  router.push(`/categories/illness_and_complications/form?id=${item.id}`);
};

  const handleViewDetails = (item) => {
    router.push(`/categories/illness_and_complications/details?id=${item.id}`);
  };

  const handleView = (item) => {
    setViewDetails(item); // updates state
    setShowDetailsModal(true); // shows the modal
  };

  const deleteModal = (item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const deleteItem = async (id) => {
    try {
      await deleteDisease(id);
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchConditions();
      toast.success("Condition deleted successfully");
    } catch (error) {
      console.error("Error deleting condition:", error);
      toast.error("Failed to delete condition");
    }
  };

  // Handle search filtering
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredConditions([]);
      setShowDropdown(false);
    } else {
      const filtered = conditions.filter((condition) =>
        condition.condition_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConditions(filtered);
      setShowDropdown(true);
    }
  }, [searchQuery, conditions]);

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

  const handleSelectCondition = (condition) => {
    setSearchQuery(condition.condition_name);
    setShowDropdown(false);
    // Scroll to the condition in the table
    const conditionIndex = conditions.findIndex((c) => c.id === condition.id);
    if (conditionIndex !== -1) {
      const pageNumber = Math.floor(conditionIndex / itemsPerPage) + 1;
      setCurrentPage(pageNumber);
    }
  };

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const dataToDisplay = searchQuery && filteredConditions.length > 0
      ? filteredConditions
      : conditions;
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
    {
      label: "Types",
      key: "types",
      type: "list",
      fields: [
        { label: "About", key: "about_type" },
        { label: "Type Name", key: "type_name" },
      ],
    },
    {
      label: "Causes",
      key: "causes",
      type: "list",
      fields: [
        { label: "Cause Name", key: "cause_name" },
        { label: "Other Possible Cause", key: "other_possible_causes" },
      ],
    },
    { label: "Diagnosis", key: "diagnosis" },
    { label: "Treatment", key: "treating" },
    { label: "Complications", key: "complications" },
    { label: "Prevention", key: "prevention" },
    { label: "Specialist to Contact", key: "specialist_to_contact" },
    { label: "Contact your Doctor", key: "contact_your_doctor" },
    { label: "Attribution", key: "attribution" },
  ];

  return (
    <div className="mt-5 relative">
      <Card
        title="Diseases & Conditions"
        className="overflow-hidden relative"
        bodyClass="p-0"
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery && setShowDropdown(true)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-800 dark:text-slate-200 w-64"
                />
              </div>
              {/* Autocomplete Dropdown */}
              {showDropdown && filteredConditions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredConditions.map((condition) => (
                    <div
                      key={condition.id}
                      onClick={() => handleSelectCondition(condition)}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-900 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                    >
                      {condition.condition_name}
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && searchQuery && filteredConditions.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-lg">
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">
                    No results found
                  </div>
                </div>
              )}
            </div>
            <Button
              text="+ Add New Disease"
              className="btn-dark max-sm:text-xs font-normal btn-sm"
             
              onClick={() =>
                router.push("/categories/illness_and_complications/form")
              }
            />
          </div>
        }
      >
        <div ref={scrollContainerRef} className="overflow-x-auto relative">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Condition Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  About
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Diagnosis
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Treatment
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Complications
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Prevention
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Specialist
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-200 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-800 dark:divide-slate-700">
              {getCurrentPageData().map((condition) => (
                <tr
                  key={condition.id}
                  className="hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <td className={`px-6 py-4 text-sm max-w-[150px] align-top ${condition.condition_name === '' ? 'text-center' : ''}`}>
                    <button
                      onClick={() => handleViewDetails(condition)}
                      className="text-secondary-800 dark:text-green-400 hover:text-secondary-600 dark:hover:text-green-300 hover:underline text-left font-medium"
                    >
                      {condition.condition_name || "N/A"}
                    </button>
                  </td>
                  <td className={`px-6 py-4 text-sm text-gray-500 max-w-[150px] dark:text-slate-200 align-top ${condition.about === '' ? 'text-center' : ''}`}>
                    <HtmlRenderer
                      htmlContent={condition.about || "N/A"}
                      maxLength={100}
                    />
                  </td>
                  <td className={`px-6 py-4 text-sm text-gray-500 max-w-[150px] dark:text-slate-200 align-top ${condition.diagnosis === '' ? 'text-center' : ''}`}>
                    <HtmlRenderer
                      htmlContent={condition.diagnosis || "N/A"}
                      maxLength={80}
                    />
                  </td>
                  <td className={`px-6 py-4 text-sm text-gray-500 max-w-[150px] dark:text-slate-200 align-top ${condition.treating === '' ? 'text-center' : ''}`}>
                    <HtmlRenderer
                      htmlContent={condition.treating || "N/A"}
                      maxLength={80}
                    />
                  </td>
                  <td className={`px-6 py-4 text-sm text-gray-500 max-w-[150px] dark:text-slate-200 align-top ${condition.complications === '' ? 'text-center' : ''}`}>
                    <HtmlRenderer
                      htmlContent={condition.complications || "N/A"}
                      maxLength={80}
                    />
                  </td>
                  <td className={`px-6 py-4 text-sm text-gray-500 max-w-[150px] dark:text-slate-200 align-top ${condition.prevention === '' ? 'text-center' : ''}`}>
                    <HtmlRenderer
                      htmlContent={condition.prevention || "N/A"}
                      maxLength={80}
                    />
                  </td>
                  <td className={`px-6 py-4 text-sm text-gray-500 max-w-[150px] dark:text-slate-200 align-top ${condition.specialist_to_contact === '' ? 'text-center' : ''}`}>
                    {condition.specialist_to_contact || "N/A" }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-200 align-top">
                    <div className="flex justify-center gap-2">
                      <Button
                        icon="heroicons-outline:pencil-alt"
                       
                        className="p-0 bg-transparent border-none"
                        onClick={() => handleEdit(condition)}
                        tooltip="Edit"
                      />
                      <Button
                        icon="heroicons-outline:trash"
                       
                        className="p-0 bg-transparent border-none"
                        onClick={() => deleteModal(condition)}
                        tooltip="Delete"
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center">
                    <Loading />
                  </td>
                </tr>
              )}
              {conditions.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
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
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Delete Condition"
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
            <p className="text-center text-gray-700 ">
              Are you sure you want to delete <br />
              <span className="font-semibold">
                "{itemToDelete?.condition_name}"
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
        title={viewDetails?.condition_name || "Condition Details"}
        titleClass="text-lg font-semibold text-white"
        activeModal={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setViewDetails(null);
        }}
        centered
        size="lg"
        themeClass="bg-[#4ab573]"
        className="sm:max-w-[70vw] max-w-[90vw]"
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

                if (type === "list") {
                  return value.map((item, index) => (
                    <div key={`${key}-${index}`} className="flex">
                      <div className="w-1/3 text-gray-900">
                        {label}
                      </div>
                      <div className="w-2/3">
                        {subFields.map(({ label: subLabel, key: subKey }) => {
                          // Check if this nested field should be rendered as HTML
                          const nestedRichTextFields = [
                            "about_type",
                            "other_possible_causes",
                          ];
                          const shouldRenderNestedAsHtml =
                            nestedRichTextFields.includes(subKey);

                          return (
                            <div key={subKey} className="mb-1">
                              <span className="text-gray-900">{subLabel}:</span>{" "}
                              {shouldRenderNestedAsHtml ? (
                                <HtmlRenderer
                                  htmlContent={item[subKey] || "-"}
                                  className="inline"
                                />
                              ) : (
                                <span>{item[subKey] || "-"}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                }

                // Check if this field should be rendered as HTML
                const richTextFields = [
                  "about",
                  "types.about_type",
                  "causes.other_possible_causes",
                  "diagnosis",
                  "treating",
                  "complications",
                  "prevention",
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

export default IllnessAndComplicationsPage;
