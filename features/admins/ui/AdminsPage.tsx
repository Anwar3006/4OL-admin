"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminStats from "./AdminStats";
import AdminCommandBar from "./AdminCommandBar";
import AllAdminsTab from "./AllAdminsTab";
import InvitationsTab from "./InvitationsTab";
import RolesPermissionsTab from "./RolesPermissionsTab";
import ActivityLogsTab from "./ActivityLogsTab";
import SecurityCenterTab from "./SecurityCenterTab";
import ReportsTab from "./ReportsTab";
import { cn } from "@/lib/utils";
import { useAddAdminDialog } from "@/features/admins/data/dialog-hooks";
import AddAdminDialog from "./add-admin-dialog";
import { usePermissionContext } from "@/stores/permission-context";

const AdminTabs = [
  { id: "all", label: "👥 All Admins" },
  { id: "invitations", label: "✉️ Invitations" },
  { id: "roles", label: "🔑 Roles & Permissions", permission: "roles.view" },
  { id: "logs", label: "📋 Activity Logs" },
  { id: "security", label: "🔐 Security Center" },
  { id: "reports", label: "📊 Reports" },
];

const AdminsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addAdmin = useAddAdminDialog();
  const { hasPermission } = usePermissionContext();
  // Mirrors the sidebar's own RBAC filtering (see NewAdminDashboardShell.tsx)
  // now that Roles & Permissions lives only as a tab here, not its own nav item.
  const visibleTabs = AdminTabs.filter((tab) => !tab.permission || hasPermission(tab.permission));
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  useEffect(() => {
    if (activeTab === "roles" && !hasPermission("roles.view")) {
      setActiveTab("all");
    }
  }, [activeTab, hasPermission]);

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
        {hasPermission("roles.view") && (
          <button className="btn btn-secondary" onClick={() => handleTabChange("roles")}>🔑 Manage Roles</button>
        )}
        <button className="btn btn-primary text-white" onClick={() => addAdmin.open()}>✉️ Invite Admin</button>
      </PageHeader>

      <div className="alert bg-red-50 border border-red-200 text-[11px] font-medium p-3 rounded-xl flex items-start gap-2.5">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <div className="flex-1">
          <strong className="text-red-700">Security Alert:</strong> Some admin accounts have MFA disabled. See the "MFA Not Set" stat below and the Security Center tab for details.
        </div>
      </div>

      <AdminStats />

      <AdminCommandBar />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-[10px] sm:text-[11px] font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 hover:bg-emerald-50/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-700",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="all"><AllAdminsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="invitations"><InvitationsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="roles"><RolesPermissionsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="logs"><ActivityLogsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="security"><SecurityCenterTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="reports"><ReportsTab /></TabsContent>
        </div>
      </Tabs>
      <AddAdminDialog />
    </div>
  );
};

export default AdminsPage;
