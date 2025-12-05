"use client";
import React, { Fragment } from "react";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Link from "next/link";
import { Menu } from "@headlessui/react";
import Card from "@/components/ui/Card";
import { useRouter } from "next/navigation";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import { useTable, useGlobalFilter, useSortBy, usePagination, useRowSelect } from "react-table";
import { specialist } from "@/constant/specialist-list";

// Define columns for the table
const columns = [
    {
        Header: 'Title',
        accessor: 'title', // accessor is the key in the data
      },
];

// Dummy data for the table
const data = specialist; // Replace with actual data if needed

const SpecialistPage = () => {
  const router = useRouter();

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        {
          id: "selection",
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <div>
              <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
            </div>
          ),
          Cell: ({ row }) => (
            <div>
              <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
            </div>
          ),
        },
        ...columns,
      ]);
    }
  );
  

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    footerGroups,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    state,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    prepareRow,
  } = tableInstance;

  const { globalFilter, pageIndex, pageSize } = state;

  const actions = [
    {
      name: "send",
      icon: "ph:paper-plane-right",
      doit: () => {
        router.push("/invoice-add");
      },
    },
    {
      name: "view",
      icon: "heroicons-outline:eye",
      doit: () => {
        router.push("/invoice-preview");
      },
    },
    {
      name: "edit",
      icon: "heroicons:pencil-square",
      doit: (id) => {
        router.push("/invoice-edit");
      },
    },
    {
      name: "delete",
      icon: "heroicons-outline:trash",
      doit: (id) => {
        return null;
      },
    },
  ];

  return (
    <div>
      <Card bodyClass="p-0 mx-2">
        <div className="flex justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-600">
          <div className="md:flex pb-6 items-center">
            <h6 className="flex-1 md:mb-0 mb-3">Specialists</h6>
          </div>
          <div className="md:flex md:space-x-3 items-center flex-none rtl:space-x-reverse">
            <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />

            <Button
              icon="heroicons-outline:filter"
              text="Filter"
              className="btn-outline-secondary text-slate-600 dark:border-slate-700 dark:text-slate-300 font-normal btn-sm"
              iconClass="text-lg"
            />
            <Button
              icon="heroicons-outline:plus-sm"
              text="Add New Specialist"
              className="btn-dark max-sm:text-xs font-normal btn-sm mr-3 max-sm:mt-2"
              iconClass="text-lg"
              onClick={() => {
                router.push("/send-notification");
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap divide-y divide-slate-100 dark:divide-slate-800 ">
     {specialist?.map((item, i) => (
    <div key={i} className="w-full sm:w-1/2 lg:w-1/2 p-2">
      <div className="relative w-full shadow-md  rounded-sm">
        <div
          className={`${
            item.unread ? "bg-slate-100 dark:bg-slate-700 dark:bg-opacity-70 text-slate-800" : "text-slate-600 dark:text-slate-300"
          } block w-full px-4 sm:py-4 py-2 text-sm cursor-pointer`}
        >
          <div className="flex items-center ltr:text-left rtl:text-right">
            {/* <div className="flex-none ltr:mr-3 rtl:ml-3">
              <div className="h-8 w-8 bg-white rounded-full">
                <img
                  src={item.image}
                  alt=""
                  className={`${
                    item.unread ? "border-white" : "border-transparent"
                  } block w-full h-full object-cover rounded-full border`}
                />
              </div>
            </div> */}
            <div className="flex-1">
              <div className={`${
                item.unread ? "text-slate-600 dark:text-slate-300" : "text-slate-600 dark:text-slate-300"
              } text-sm`}>
               <span className="lg:mr-4 mr-2">🞺</span>  {item.title}
              </div>
              {/* <div className={`${
                item.unread ? "text-slate-500 dark:text-slate-200" : "text-slate-600 dark:text-slate-300"
              } text-xs leading-4`}>
                {item.desc}
              </div> */}
              {/* <div className="text-slate-400 dark:text-slate-400 text-xs mt-1">
                3 min ago
              </div> */}
            </div>
            {item.unread && (
              <div className="flex-0">
                <span className="h-[10px] w-[10px] bg-danger-500 border border-white dark:border-slate-400 rounded-full inline-block"></span>
              </div>
            )}
          </div>
        </div>

        <Menu as="div" className="absolute lg:top-4 top-2 right-2">
          <Menu.Button>
            <Icon icon="heroicons-outline:dots-vertical" className="text-slate-600 dark:text-slate-300" />
          </Menu.Button>
          <Menu.Items className="origin-top-right z-50 absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`${
                      active ? "bg-slate-100 dark:bg-slate-700 w-full text-left text-slate-900 dark:text-slate-300" : "text-slate-600 dark:text-slate-300"
                    } block px-4 py-2 text-sm`}
                    onClick={() => console.log('View clicked', item)}
                  >
                    View
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`${
                      active ? "bg-slate-100 dark:bg-slate-700 w-full text-left text-slate-900 dark:text-slate-300" : "text-slate-600 dark:text-slate-300"
                    } block px-4 py-2 text-sm`}
                    onClick={() => console.log('Edit clicked', item)}
                  >
                    Edit
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    className={`${
                      active ? "bg-slate-100 dark:bg-slate-700 w-full text-left text-slate-900 dark:text-slate-300" : "text-slate-600 dark:text-slate-300"
                    } block px-4 py-2 text-sm`}
                    onClick={() => console.log('Delete clicked', item)}
                  >
                    Delete
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Menu>
      </div>
    </div>
  ))}
</div>

<div className="md:flex md:space-y-0 space-y-5 justify-between mt-6 items-center ml-2 py-2">
  <div className="flex items-center space-x-3 rtl:space-x-reverse">
    <span className="flex space-x-2 rtl:space-x-reverse items-center">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Go
      </span>
      <span>
        <input
          type="number"
          className="form-control py-2"
          defaultValue={pageIndex + 1}
          min={1}
          max={pageOptions.length}
          onChange={(e) => {
            const pageNumber = e.target.value ? Number(e.target.value) - 1 : 0;
            gotoPage(pageNumber);
          }}
          style={{ width: "50px" }}
        />
      </span>
    </span>
    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
      Page{" "}
      <span>
        {pageIndex + 1} of {pageOptions.length}
      </span>
    </span>
  </div>
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
    {pageOptions.map((_, pageIdx) => (
      <li key={pageIdx}>
        <button
          aria-current="page"
          className={`${
            pageIdx === pageIndex
              ? "bg-slate-900 dark:bg-slate-600 dark:text-slate-200 text-white font-medium"
              : "bg-slate-100 dark:bg-slate-700 dark:text-slate-400 text-slate-900 font-normal"
          } text-sm rounded leading-[16px] flex h-6 w-6 items-center justify-center transition-all duration-150`}
          onClick={() => gotoPage(pageIdx)}
        >
          {pageIdx + 1}
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


      </Card>
    </div>
  );
};

export default SpecialistPage;
