"use client";
import { Icon } from "@iconify/react";
import React from "react";

const PaginationNew = ({
  pageIndex,
  pageOptions,
  gotoPage,
  previousPage,
  nextPage,
  canPreviousPage,
  canNextPage,
}) => {
  const totalPages = pageOptions.length;

  const renderPageButton = (pageNum) => (
    <li key={pageNum}>
      <button
        className={`${
          pageNum === pageIndex
            ? "border-b-2 border-indigo-600 text-indigo-600"
            : "text-slate-600 dark:text-gray-100"
        } text-sm px-2 py-1 transition-all duration-150`}
        onClick={() => gotoPage(pageNum)}
      >
        {pageNum + 1}
      </button>
    </li>
  );

  const getPageButtons = () => {
    const buttons = [];

    const startPage = Math.max(1, pageIndex - 1);
    const endPage = Math.min(totalPages - 2, pageIndex + 1);

    // Always show first page
    buttons.push(renderPageButton(0));

    // If there's a gap between first and middle
    if (startPage > 1) {
      buttons.push(
        <li key="left-ellipsis" className="text-slate-500 dark:text-gray-100">
          ...
        </li>
      );
    }

    // Middle pages: current -1, current, current +1
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(renderPageButton(i));
    }

    // If there's a gap between middle and last
    if (endPage < totalPages - 2) {
      buttons.push(
        <li key="right-ellipsis" className="text-slate-500 dark:text-gray-100">
          ...
        </li>
      );
    }

    // Always show last page
    if (totalPages > 1) {
      buttons.push(renderPageButton(totalPages - 1));
    }

    return buttons;
  };

  return (
    <div className="md:flex w-full overflow-x-auto justify-end my-2 items-end sm:text-sm text-xs">
      <ul className="flex items-center space-x-2 whitespace-nowrap rtl:space-x-reverse">
        <li>
          <button
            className={`flex items-center space-x-1 ${
              !canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
          >
            <Icon icon="heroicons-outline:chevron-left" />
            <span>Previous</span>
          </button>
        </li>

        {/* Page Numbers */}
        {getPageButtons()}

        <li>
          <button
            className={`flex items-center space-x-1 ${
              !canNextPage ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => nextPage()}
            disabled={!canNextPage}
          >
            <span>Next</span>
            <Icon icon="heroicons-outline:chevron-right" />
          </button>
        </li>
      </ul>
    </div>
  );
};

export default PaginationNew;
