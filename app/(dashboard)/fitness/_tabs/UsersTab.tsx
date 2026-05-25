"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Users, Search, Filter, UserPlus, TrendingDown, Clock, ShieldCheck } from "lucide-react";
import { DataTable } from "@/components/Data-Table/data-table";
import { createPaginationHandlers } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { fitnessUserColumns } from "@/components/Data-Table/columns/fitnessUserColumns";

const UsersTab = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const limit = 10;

  const { data, isLoading } = useUsers({
    page,
    limit,
    search: debouncedSearch,
    admin: false,
    userType: 'user',
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const paginationHandlers = useMemo(
    () => createPaginationHandlers(page, setPage, data?.meta?.totalPages ?? 1),
    [page, data?.meta?.totalPages],
  );

  const pagination = useMemo(
    () => ({
      currentPage: page,
      totalPages: data?.meta?.totalPages || 1,
      totalItems: data?.meta?.total || 0,
      pageSize: limit,
      onPageChange: paginationHandlers.goTo,
      onNextPage: paginationHandlers.next,
      onPreviousPage: paginationHandlers.previous,
      canNextPage: page < (data?.meta?.totalPages || 1),
      canPreviousPage: page > 1,
    }),
    [page, data, paginationHandlers],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm rounded-[2rem] bg-white">
          <CardHeader className="p-8 pb-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <CardTitle className="text-2xl font-black">👥 Fitness Users</CardTitle>
                   <p className="text-slate-500 font-medium mt-1">Monitor user engagement, progress and platform activity</p>
                </div>
                <Button className="rounded-xl font-bold bg-[#131927] hover:bg-slate-800 shadow-lg">
                  <UserPlus className="h-4 w-4 mr-2" /> Invite User
                </Button>
             </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
             <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or ID..."
                    className="pl-9 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-slate-900"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-12 rounded-2xl font-bold border-slate-200">
                  <Filter className="h-4 w-4 mr-2" /> Activity Level
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-[2rem] bg-slate-50 p-8">
           <CardTitle className="text-lg font-black mb-6 text-slate-900">📊 Risk Profile</CardTitle>
           <div className="space-y-6">
              {[
                { label: "Active (7d)", val: "2,140", icon: Users, color: "text-emerald-500" },
                { label: "Premium", val: "840", icon: ShieldCheck, color: "text-blue-500" },
                { label: "Churn Risk", val: "124", icon: TrendingDown, color: "text-rose-500" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      <span className="text-xs font-bold text-slate-500">{stat.label}</span>
                   </div>
                   <span className="text-lg font-black text-slate-700">{stat.val}</span>
                </div>
              ))}
           </div>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            columns={fitnessUserColumns}
            data={data?.users || []}
            pagination={pagination}
            isLoading={isLoading}
            onRowClick={() => {}}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersTab;
