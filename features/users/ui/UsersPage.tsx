"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/stores/permission-context";
import UsersStats from "./UsersStats";
import AllUsersTab from "./AllUsersTab";
import ActiveUsersTab from "./ActiveUsersTab";
import PremiumUsersTab from "./PremiumUsersTab";
import FlaggedUsersTab from "./FlaggedUsersTab";
import DeleteRequestsTab from "./DeleteRequestsTab";
import InviteUserDialog from "./InviteUserDialog";
import ViewUserDialog from "./view-user-dialog";
import FlagUserDialog from "./flag-user-dialog";
import { cn } from "@/lib/utils";

const UserTabs = [
  { id: "all", label: "👥 All Users" },
  { id: "active", label: "📈 Active" },
  { id: "premium", label: "⭐ Premium" },
  { id: "flagged", label: "🚩 Flagged" },
  { id: "delete-requests", label: "🗑️ Delete Requests" },
];

const UsersPage = () => {
  const searchParams = useSearchParams();
  const canEdit = useHasPermission("users.edit");
  const canExport = useHasPermission("users.export");
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");
  const [inviteOpen, setInviteOpen] = useState(false);

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
        {canExport && (
          <button
            className="btn btn-secondary"
            onClick={() => window.open("/api/admin/users/export", "_blank")}
          >
            📥 Export User Data
          </button>
        )}
        {canEdit && (
          <button className="btn btn-primary text-white" onClick={() => setInviteOpen(true)}>
            ➕ Add User / Invite
          </button>
        )}
      </PageHeader>

      <div className="alert al-ic flex items-start gap-3">
        <span>🔐</span>
        <div className="text-xs leading-relaxed">
          <strong>PHI protection (GH-DPA 2012).</strong> Health data is encrypted
          at rest (AES-256); names, phones, emails and NHIS numbers shown here
          are masked per your role. Access is logged and exports watermarked.
        </div>
      </div>

      <UsersStats />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {UserTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
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
          <TabsContent className="w-full min-w-0 outline-none" value="all"><AllUsersTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="active"><ActiveUsersTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="premium"><PremiumUsersTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="flagged"><FlaggedUsersTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="delete-requests"><DeleteRequestsTab /></TabsContent>
        </div>
      </Tabs>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ViewUserDialog />
      <FlagUserDialog />
    </div>
  );
};

export default UsersPage;
