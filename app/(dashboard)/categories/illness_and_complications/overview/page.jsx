"use client";
import { deleteDisease, getAllDiseases } from "@/app/services/diseases-service";
import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

const IllnessAndComplicationsPage = () => {
  const router = useRouter();
  const [conditions, setConditions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConditions();
  }, [currentPage]);

  const fetchConditions = async () => {
    try {
      const data = await getAllDiseases();
      if (data) {
        setConditions(data);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching conditions:", error);
      toast.error("Failed to load conditions");
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
    router.push(
      `/categories/illness_and_complications/form?disease=${encodedItem}`
    );
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

  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return conditions.slice(startIndex, endIndex);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

  return (
    <div className="">
      <div className="mt-8 relative">
        <Card
          title="Diseases"
          className="bg-white dark:bg-slate-800 overflow-hidden relative"
          bodyClass="p-0"
        >
          <div className="absolute top-2 right-2 justify-end p-4">
            <Button
              text="Add New Disease"
              icon="heroicons-outline:plus"
              className="bg-[#56ce84] text-white rounded-md p-2 text-sm hover:bg-[#46b276] transition-colors"
              onClick={() =>
                router.push("/categories/illness_and_complications/form")
              }
            />
          </div>
          <div ref={scrollContainerRef} className="overflow-x-auto relative">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Condition Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    About
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Diagnosis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Treatment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Complications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Prevention
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Specialist
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentPageData().map((condition) => (
                  <tr key={condition.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {condition.condition_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                      {truncateText(condition.about)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                      {truncateText(condition.diagnosis)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                      {truncateText(condition.treating)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                      {truncateText(condition.complications)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                      {truncateText(condition.prevention)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[150px] truncate">
                      {condition.specialist_to_contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Button
                          icon="lets-icons:eye"
                          iconClass="text-blue-500 text-xl"
                          className="p-1 bg-transparent border-none"
                          onClick={() => handleView(condition)}
                          tooltip="View Details"
                        />
                        <Button
                          icon="heroicons-outline:pencil-alt"
                          iconClass="text-green-500 text-xl"
                          className="p-1 bg-transparent border-none"
                          onClick={() => handleEdit(condition)}
                          tooltip="Edit"
                        />
                        <Button
                          icon="heroicons-outline:trash"
                          iconClass="text-red-500 text-xl"
                          className="p-1 bg-transparent border-none"
                          onClick={() => deleteModal(condition)}
                          tooltip="Delete"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {conditions.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No conditions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              <p className="text-center text-gray-700 dark:text-gray-300">
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
          title={
            viewDetails?.condition_name + " Detailed Summary" ||
            "Condition Details"
          }
          titleClass="text-lg font-semibold text-white"
          activeModal={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewDetails(null);
          }}
          centered
          size="lg"
          themeClass="bg-[#4ab573]"
        >
          <div
            style={{ scrollbarWidth: 0 }}
            className="p-4 max-h-[80vh] overflow-y-auto hidden-scrollbar"
          >
            {viewDetails && (
              <div className="space-y-4">
                <div>
                  <h5 className="text-md font-semibold text-gray-700">About</h5>
                  <p className="text-gray-600 mt-1">{viewDetails.about}</p>
                </div>

                <div>
                  <h5 className="text-md font-semibold text-gray-700">
                    Diagnosis
                  </h5>
                  <p className="text-gray-600 mt-1">{viewDetails.diagnosis}</p>
                </div>

                <div>
                  <h5 className="text-md font-semibold text-gray-700">
                    Treatment
                  </h5>
                  <p className="text-gray-600 mt-1">{viewDetails.treating}</p>
                </div>

                <div>
                  <h5 className="text-md font-semibold text-gray-700">
                    Complications
                  </h5>
                  <p className="text-gray-600 mt-1">
                    {viewDetails.complications}
                  </p>
                </div>

                <div>
                  <h5 className="text-md font-semibold text-gray-700">
                    Prevention
                  </h5>
                  <p className="text-gray-600 mt-1">{viewDetails.prevention}</p>
                </div>

                <div>
                  <h5 className="text-md font-semibold text-gray-700">
                    Specialist to Contact
                  </h5>
                  <p className="text-gray-600 mt-1">
                    {viewDetails.specialist_to_contact}
                  </p>
                </div>

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

      {totalPages > 0 && (
        <div className="flex justify-end items-center m-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default IllnessAndComplicationsPage;
