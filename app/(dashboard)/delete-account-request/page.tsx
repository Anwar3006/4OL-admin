"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteRequestStats from "./_components/DeleteRequestStats";
import AllRequestsTab from "./_components/AllRequestsTab";
import SettingsPolicyTab from "./_components/SettingsPolicyTab";
import { cn } from "@/lib/utils";

const TabsConfig = [
  { id: "all", label: "🗑️ All Requests" },
  { id: "pending", label: "⏳ Pending (4)" },
  { id: "grace", label: "⏰ Grace Period (3)" },
  { id: "completed", label: "✅ Completed" },
  { id: "settings", label: "⚙️ Settings & Policy" },
];

const DeleteAccountRequestPage = () => {
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
    router.push(`/delete-account-request?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🗑️ Delete Account Requests"
        subtitle="Google Play & App Store policy compliance · GH-DPA data erasure"
      >
        <button className="btn btn-secondary btn-sm">📥 Export Log</button>
        <button className="btn btn-secondary btn-sm font-black uppercase tracking-widest text-[9px]">Copy Public Link</button>
        <button className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]">+ Manual Entry</button>
      </PageHeader>

      <div className="alert bg-blue-50 border border-blue-200 text-[11px] font-medium p-4 rounded-xl flex items-start gap-3">
        <span className="text-base leading-none mt-0.5 text-blue-700">⚠️</span>
        <div className="flex-1 text-blue-700 leading-relaxed">
          <strong className="font-black">Google Play & App Store Policy Compliance.</strong> Account deletion requests are processed within 30 days per Ghana Data Protection Act (GH-DPA) guidelines. 
          The public form URL is: <b className="font-mono ml-1">https://4ourlife.com.gh/delete-account</b>
        </div>
      </div>

      <DeleteRequestStats />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TabsConfig.map((tab) => (
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
          <TabsContent className="w-full min-w-0 outline-none" value="all"><AllRequestsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pending"><AllRequestsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="grace"><AllRequestsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="completed"><AllRequestsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="settings"><SettingsPolicyTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default DeleteAccountRequestPage;
