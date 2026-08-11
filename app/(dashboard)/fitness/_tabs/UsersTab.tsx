"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";
import { DataTable } from "@/components/Data-Table/data-table";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import {
  Users,
  Search,
  Filter,
  UserPlus,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

const UsersTab = () => {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;
  const searchParams = useSearchParams();

  // Read page from URL to trigger refetch when pagination changes
  const page = parseInt(searchParams.get("fit_user_page") || "1", 10);

  const { data, isLoading, isError, error } = useUsers({
    page,
    limit,
    search: debouncedSearch,
    admin: false,
    userType: "user",
  });

  const columns = useMemo(
    () => [
    {
      accessorKey: "user",
      header: "User Profile",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden">
            {row.original.image ? (
              <Image
                src={row.original.image}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="w-full h-full object-cover"
              />
            ) : (
              row.original.first_name?.[0] || "U"
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800">
              {row.original.first_name} {row.original.last_name}
            </span>
            <span className="text-[10px] text-slate-400">
              {row.original.email}
            </span>
          </div>
        </div>
      ),
    },
    // {
    //   accessorKey: "role",
    //   header: "Role",
    //   cell: ({ row }: any) => (
    //     <span className="badge badge-blue uppercase tracking-wider text-[10px]">
    //       {row.original.role || "User"}
    //     </span>
    //   ),
    // },
    {
      accessorKey: "activity",
      header: "Activity",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-800">
            {row.original.last_login
              ? new Date(row.original.last_login).toLocaleDateString()
              : "N/A"}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-black">
            Last Login
          </span>
        </div>
      ),
    },
    {
      accessorKey: "engagement",
      header: "Engagement",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: "65%" }}
            />
          </div>
          <span className="text-[10px] font-black text-slate-400">65%</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => (
        <span className="badge badge-green h-5 text-[10px] uppercase font-black">
          Active
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => {
        const user = row.original;
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                console.log("View", user);
              }}
            >
              👁️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                console.log("Edit", user);
              }}
            >
              ✏️
            </button>
            <button
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                console.log("Delete", user);
              }}
            >
              🗑️
            </button>
          </div>
        );
      },
    },
    ],
    [],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-3 card bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-800">
                👥 Fitness Users
              </h3>
              <p className="text-slate-500 font-medium mt-1">
                Monitor user engagement, progress and platform activity
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by name, email or ID..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-ek-green/20 focus:border-ek-green transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.users || []}
          isLoading={isLoading}
          isError={isError}
          error={error}
          pagination={true}
          urlPersistence={{
            pageKey: "fit_user_page",
            pageSizeKey: "fit_user_pageSize",
          }}
          totalItems={data?.meta?.total || 0}
        />
      </div>
    </div>
  );
};

export default UsersTab;
