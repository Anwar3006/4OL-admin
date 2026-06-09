"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import DataTable from "@/components/redesign/DataTable";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { Users, Search, Filter, UserPlus, TrendingDown, ShieldCheck } from "lucide-react";

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

  const columns = [
    {
      key: "user",
      label: "User Profile",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 overflow-hidden">
            {row.image ? <img src={row.image} alt="" className="w-full h-full object-cover" /> : (row.first_name?.[0] || 'U')}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800">{row.first_name} {row.last_name}</span>
            <span className="text-[10px] text-slate-400">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: "role",
      label: "Role",
      render: (val: string) => (
        <span className="badge badge-blue uppercase tracking-wider text-[10px]">{val || 'User'}</span>
      )
    },
    {
      key: "activity",
      label: "Activity",
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-slate-800">{row.last_login ? new Date(row.last_login).toLocaleDateString() : 'N/A'}</span>
          <span className="text-[10px] text-slate-400 uppercase font-black">Last Login</span>
        </div>
      )
    },
    {
      key: "engagement",
      label: "Engagement",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-emerald-500 h-full rounded-full" style={{ width: '65%' }} />
          </div>
          <span className="text-[10px] font-black text-slate-400">65%</span>
        </div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: () => (
        <span className="badge badge-green h-5 text-[10px] uppercase font-black">Active</span>
      )
    }
  ];

  const rowActions = [
    { label: "View Profile", icon: "👁️", onClick: (row: any) => console.log('View', row) },
    { label: "Invite to Challenge", icon: "🏆", onClick: (row: any) => console.log('Invite', row) },
    { label: "Edit Role", icon: "✏️", onClick: (row: any) => console.log('Edit', row) },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 card bg-white">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                 <h3 className="text-2xl font-black text-slate-800">👥 Fitness Users</h3>
                 <p className="text-slate-500 font-medium mt-1">Monitor user engagement, progress and platform activity</p>
              </div>
              <button className="btn btn-primary shadow-lg">
                <UserPlus className="h-4 w-4 mr-1" /> Invite User
              </button>
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
              <button className="btn btn-secondary">
                <Filter className="h-4 w-4 mr-1" /> Activity Level
              </button>
           </div>
        </div>

        <div className="card bg-slate-50 border-slate-200">
           <h3 className="text-lg font-black mb-6 text-slate-900">📊 Risk Profile</h3>
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
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.users || []}
          rowActions={rowActions}
          isLoading={isLoading}
          externalPage={page}
          externalTotalPages={data?.meta?.totalPages || 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default UsersTab;
