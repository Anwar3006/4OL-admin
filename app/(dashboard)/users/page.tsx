"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsersStats from "./_components/UsersStats";
import AllUsersTab from "./_components/AllUsersTab";
import FlaggedUsersTab from "./_components/FlaggedUsersTab";
import DeleteRequestsTab from "./_components/DeleteRequestsTab";
import { cn } from "@/lib/utils";

const UserTabs = [
  { id: "all", label: "👥 All Users" },
  { id: "flagged", label: "🚩 Flagged" },
  { id: "delete-requests", label: "🗑️ Delete Requests" },
];

const UsersPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", value);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="👥 User Management"
        subtitle="Manage user accounts, monitor activity, and handle requests"
      >
        <button className="btn btn-secondary">📥 Export User Data</button>
        <button className="btn btn-primary text-white">➕ Add User</button>
      </PageHeader>

      <UsersStats />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {UserTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent value="all"><AllUsersTab /></TabsContent>
          <TabsContent value="flagged"><FlaggedUsersTab /></TabsContent>
          <TabsContent value="delete-requests"><DeleteRequestsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default UsersPage;
