"use client";

import React, { useState, useCallback, useMemo } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import DataTable from "@/components/redesign/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAddHealthyLivingDialog,
  useViewHealthyLivingDialog,
} from "@/stores/dialog-store";
import {
  useHealthyLivings,
  useDeleteHealthyLiving,
} from "@/hooks/supabase-calls/useHealthyLiving";
import AddHealthyLivingDialog from "./_components/add-healthyLiving-dialog";
import ViewHealthyLivingDialog from "./_components/view-healthyLiving-dialog";
import { cn } from "@/lib/utils";

const HealthyLivingPage = () => {
  const addHealthLiving = useAddHealthyLivingDialog();
  const viewHealthyLiving = useViewHealthyLivingDialog();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const page = 1;
  const limit = 10;

  const { mutate: deleteHealthyLiving } = useDeleteHealthyLiving();
  const { data: healthyLivingData } = useHealthyLivings({
    page,
    limit,
    search: search || undefined,
  });

  const handleDelete = useCallback(
    (id: string) => {
      if (
        globalThis.confirm(
          "Are you sure you want to delete this Healthy Living item?",
        )
      ) {
        deleteHealthyLiving(id);
      }
    },
    [deleteHealthyLiving],
  );

  // Convert data to columns format for redesign DataTable
  const tableColumns = useMemo(
    () => [
      {
        key: "name",
        label: "Article Name",
        width: 250,
        render: (value: string, row: any) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-slate-800">
              {value || "Untitled"}
            </span>
            {row.slug && (
              <span className="text-xs text-slate-500 font-mono">
                /{row.slug}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "content_type",
        label: "Type",
        width: 100,
        render: (value: string) => (
          <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded capitalize">
            {value || "article"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: 120,
        render: (value: string) => {
          const statusColors: Record<string, string> = {
            published: "bg-emerald-50 text-emerald-700",
            draft: "bg-slate-100 text-slate-700",
            pending_review: "bg-amber-50 text-amber-700",
            archived: "bg-rose-50 text-rose-700",
          };
          const colorClass = statusColors[value] || statusColors.draft;
          return (
            <span
              className={`text-xs font-semibold px-2 py-1 rounded capitalize ${colorClass}`}
            >
              {value?.replace("_", " ") || "draft"}
            </span>
          );
        },
      },
      {
        key: "is_featured",
        label: "Featured",
        width: 80,
        render: (value: boolean) => (
          <div className="text-center">
            {value ? (
              <span className="text-lg">⭐</span>
            ) : (
              <span className="text-slate-300">○</span>
            )}
          </div>
        ),
      },
      {
        key: "view_count",
        label: "Views",
        width: 80,
        render: (value: number) => (
          <div className="flex items-center gap-1 justify-center">
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-sm text-slate-600">{value || 0}</span>
          </div>
        ),
      },
      {
        key: "created_at",
        label: "Created",
        width: 130,
        render: (value: string) => (
          <span className="text-xs text-slate-600">
            {new Date(value).toLocaleDateString(undefined, {
              dateStyle: "medium",
            })}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        width: 120,
        render: (value: any, row: any) => (
          <div className="flex items-center gap-1 justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => viewHealthyLiving.open(row.id)}
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
              onClick={() => addHealthLiving.open(row)}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => handleDelete(row.id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [viewHealthyLiving, addHealthLiving, handleDelete],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🥗 Healthy Living"
        subtitle="Public health knowledge base · Lifestyle guidance · Wellness content"
      >
        <button className="btn btn-secondary btn-sm font-bold">
          📥 Export CSV
        </button>
        <button
          className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]"
          onClick={() => addHealthLiving.open()}
        >
          + Add Article
        </button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 mb-5">
        <KpiCard
          icon="📊"
          label="Total Articles"
          value={(healthyLivingData?.meta?.total || 0).toString()}
          variant="blue"
          delta="+4 this month"
          deltaType="up"
        />
        <KpiCard
          icon="📂"
          label="Categories"
          value="12"
          variant="purple"
          delta="Well organized"
        />
        <KpiCard
          icon="👁️"
          label="Total Views"
          value="48K"
          variant="teal"
          delta="+12.4%"
          deltaType="up"
        />
        <KpiCard
          icon="✅"
          label="Avg Rating"
          value="4.8"
          variant="green"
          delta="High helpfulness"
          deltaType="up"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-transparent h-auto p-0 flex gap-0 border-b border-slate-200 w-full justify-start rounded-none overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "All Content", icon: "🥗" },
            { id: "categories", label: "Categories", icon: "📂" },
            { id: "engagement", label: "Analytics", icon: "📊" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="outline-none mt-4">
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <div className="relative flex-1 min-w-60">
              <input
                className="w-full h-8 pl-3 pr-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-ek-green/20 outline-none transition-all"
                placeholder="🔍 Search articles by title, topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
              <option>All Topics</option>
            </select>
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white outline-none focus:ring-2 focus:ring-ek-green/20">
              <option>All Status</option>
            </select>
            <button className="btn btn-secondary btn-sm font-bold text-[10px]">
              📥 Export
            </button>
          </div>

          <div className="card p-0 overflow-hidden border border-slate-200 shadow-sm rounded-xl">
            <DataTable
              columns={tableColumns}
              data={healthyLivingData?.healthyLivings || []}
              selectable
              pagination={false}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button className="btn btn-secondary btn-sm font-bold text-[10px]">
              ✅ Publish Selected
            </button>
            <button className="btn btn-danger btn-sm font-bold text-[10px]">
              🗑️ Delete Selected
            </button>
          </div>
        </TabsContent>

        {["categories", "engagement"].map((tabId) => (
          <TabsContent key={tabId} value={tabId} className="outline-none mt-4">
            <div className="card py-20 text-center border border-slate-200 shadow-sm rounded-xl">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-2xl">
                  {tabId === "categories" ? "📂" : "📊"}
                </div>
                <h3 className="text-lg font-black text-slate-800 capitalize">
                  {tabId} View
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  This module is currently being optimized for wellness data
                  analytics.
                </p>
                <div className="flex justify-center gap-2">
                  <span className="badge badge-amber uppercase">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <AddHealthyLivingDialog />
      <ViewHealthyLivingDialog />
    </div>
  );
};

export default HealthyLivingPage;
