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
  return (
    <div className="md:flex  justify-end mt-6 items-end sm:text-sm text-xs">
      {/* <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <span className="flex space-x-2 rtl:space-x-reverse items-center">
          <span className="sm:text-sm text-xs font-medium text-slate-600 dark:text-slate-300">
            Go
          </span>
          <span>
            <input
              type="number"
              className="form-control py-2 sm:text-sm text-xs"
              value={pageIndex + 1}
              onChange={(e) => {
                const pageNumber = e.target.value
                  ? Number(e.target.value) - 1
                  : 0;
                gotoPage(pageNumber);
              }}
              style={{ width: "40px" }}
            />
          </span>
        </span>
        <span className="sm:text-sm text-xs font-medium text-slate-600 dark:text-slate-300">
          Page {pageIndex + 1} of {pageOptions.length}
        </span>
      </div> */}
      <ul className="flex items-center space-x-3 rtl:space-x-reverse">
        <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
          <button
            className={`${
              !canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
          >
            <Icon icon="heroicons-outline:chevron-left" />
          </button>
        </li>
        {pageOptions.map((page, pageIdx) => (
          <li key={pageIdx}>
            <button
              className={`${
                pageIdx === pageIndex
                  ? "bg-slate-900 dark:bg-slate-600 dark:text-slate-200 text-white font-medium"
                  : "bg-slate-100 dark:bg-slate-700 dark:text-slate-400 text-slate-900 font-normal"
              } text-sm rounded leading-[16px] flex h-6 w-6 items-center justify-center transition-all duration-150`}
              onClick={() => gotoPage(pageIdx)}
            >
              {page + 1}
            </button>
          </li>
        ))}
        <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
          <button
            className={`${
              !canNextPage ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={() => nextPage()}
            disabled={!canNextPage}
          >
            <Icon icon="heroicons-outline:chevron-right" />
          </button>
        </li>
      </ul>
    </div>
  );
};

export default PaginationNew;
