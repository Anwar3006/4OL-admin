import { useEffect, useState } from "react";

import Icon from "@/components/ui/Icon";

type PageItem = number | "start-ellipsis" | "end-ellipsis";

export interface PaginationProps {
  totalPages: number;
  currentPage: number;
  handlePageChange: (page: number) => void;
  /** Render "Previous"/"Next" as words instead of chevrons. */
  text?: boolean;
  className?: string;
}

const Pagination = ({
  totalPages,
  currentPage,
  handlePageChange,
  text,
  className = "custom-class",
}: PaginationProps) => {
  const [pagesToShow, setPagesToShow] = useState<PageItem[]>([]);

  useEffect(() => {
    const pages: PageItem[] = [];
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    pages.push(1);

    if (startPage > 2) {
      pages.push("start-ellipsis");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push("end-ellipsis");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    setPagesToShow(pages);
  }, [totalPages, currentPage]);

  return (
    <div className={className}>
      <ul className="pagination flex items-center space-x-2">
        <li>
          {text ? (
            <button
              className="text-slate-600 dark:text-slate-300 prev-next-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
          ) : (
            <button
              className="text-xl leading-4 text-slate-900 dark:text-white h-6 w-6 flex items-center justify-center flex-col prev-next-btn"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <Icon icon="heroicons-outline:chevron-left" />
            </button>
          )}
        </li>

        {pagesToShow.map((page, idx) => {
          if (page === "start-ellipsis" || page === "end-ellipsis") {
            return (
              <li key={page + String(idx)} className="text-slate-500 text-sm px-2">
                ...
              </li>
            );
          }

          return (
            <li key={page}>
              <button
                className={`page-link px-2 py-1 text-sm rounded ${
                  page === currentPage
                    ? "border-b-2 border-secondary-800 text-secondary-600"
                    : "text-slate-600"
                }`}
                onClick={() => handlePageChange(page)}
                disabled={page === currentPage}
              >
                {page}
              </button>
            </li>
          );
        })}

        <li>
          {text ? (
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="text-slate-600 dark:text-slate-300 prev-next-btn"
            >
              Next
            </button>
          ) : (
            <button
              className="text-xl leading-4 text-slate-900 dark:text-white h-6 w-6 flex items-center justify-center flex-col prev-next-btn"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <Icon icon="heroicons-outline:chevron-right" />
            </button>
          )}
        </li>
      </ul>
    </div>
  );
};

export default Pagination;
