"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminStats from "./_components/AdminStats";
import AdminCommandBar from "./_components/AdminCommandBar";
import AllAdminsTab from "./_components/AllAdminsTab";
import RolesPermissionsTab from "./_components/RolesPermissionsTab";
import ActivityLogsTab from "./_components/ActivityLogsTab";
import SecurityCenterTab from "./_components/SecurityCenterTab";
import ReportsTab from "./_components/ReportsTab";
import { cn } from "@/lib/utils";
import { useAddAdminDialog } from "@/stores/dialog-store";
import AddAdminDialog from "./_components/add-admin-dialog";

const AdminTabs = [
  { id: "all", label: "👥 All Admins" },
  { id: "roles", label: "🔑 Roles & Permissions" },
  { id: "logs", label: "📋 Activity Logs" },
  { id: "security", label: "🔐 Security Center" },
  { id: "reports", label: "📊 Reports" },
];

const AdminsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addAdmin = useAddAdminDialog();
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
        title="👥 Admin Management"
        subtitle="Manage admin accounts, roles, permissions and platform security"
      >
        <button className="btn btn-secondary">🛡️ SA Commands</button>
        <button className="btn btn-secondary">🔑 Manage Roles</button>
        <button className="btn btn-primary text-white" onClick={() => addAdmin.open()}>✉️ Invite Admin</button>
      </PageHeader>

      <div className="alert bg-red-50 border border-red-200 text-[11px] font-medium p-3 rounded-xl flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <div className="flex-1">
          <strong className="text-red-700">Security Alert:</strong> 2 admins have MFA disabled (Anwar Sadat Mamudu, 4 Our Life Admin). Enforce immediately. 
          <span className="bg-red-200 text-red-700 font-extrabold px-2 py-0.5 rounded ml-2 cursor-pointer hover:bg-red-300 transition-colors">Force Enable MFA →</span>
        </div>
        <span className="text-slate-400 font-bold whitespace-nowrap">May 15, 2026</span>
      </div>

      <AdminStats />

      <AdminCommandBar />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {AdminTabs.map((tab) => (
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
          <TabsContent value="all"><AllAdminsTab /></TabsContent>
          <TabsContent value="roles"><RolesPermissionsTab /></TabsContent>
          <TabsContent value="logs"><ActivityLogsTab /></TabsContent>
          <TabsContent value="security"><SecurityCenterTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
        </div>
      </Tabs>
      <AddAdminDialog />
    </div>
  );
};

export default AdminsPage;
