"use client";

/**
 * Delete Account Requests page (Gap Analysis Part Z).
 * Live tab counts from the Epic 21 stats RPC; tabs render server-filtered
 * lists; header actions (Export / Copy public link / Manual entry) wired.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteRequestStats from "./_components/DeleteRequestStats";
import AllRequestsTab from "./_components/AllRequestsTab";
import SettingsPolicyTab from "./_components/SettingsPolicyTab";
import { cn } from "@/lib/utils";
import {
  useCreateManualDeleteRequest,
  useDeleteRequestStatsQuery,
} from "@/hooks/supabase-calls/useDeleteAccountRequests";

const VALID_TABS = new Set(["all", "pending", "grace", "completed", "settings"]);

const STATUS_BY_TAB: Record<string, "pending_review" | "grace_period" | "completed" | undefined> = {
  all: undefined,
  pending: "pending_review",
  grace: "grace_period",
  completed: "completed",
};

const DeleteAccountRequestPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && VALID_TABS.has(tabParam) ? tabParam : "all",
  );
  const [manualOpen, setManualOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualReason, setManualReason] = useState("");

  const { data: stats } = useDeleteRequestStatsQuery();
  const manualMutation = useCreateManualDeleteRequest();

  useEffect(() => {
    if (tabParam && VALID_TABS.has(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/delete-account-request?tab=${value}`, { scroll: false });
  };

  const tabsConfig = [
    { id: "all", label: `🗑️ All Requests${stats ? ` (${stats.total})` : ""}` },
    { id: "pending", label: `⏳ Pending${stats ? ` (${stats.pending_review})` : ""}` },
    { id: "grace", label: `⏰ Grace Period${stats ? ` (${stats.grace_period})` : ""}` },
    { id: "completed", label: `✅ Completed${stats ? ` (${stats.completed})` : ""}` },
    { id: "settings", label: "⚙️ Settings & Policy" },
  ];

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText("https://4ourlife.com.gh/delete-account");
      toast.success("Public deletion form link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const submitManualEntry = () => {
    if (!manualEmail) return;
    manualMutation.mutate(
      { email: manualEmail, reason: manualReason || undefined },
      {
        onSuccess: () => {
          setManualOpen(false);
          setManualEmail("");
          setManualReason("");
        },
      },
    );
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🗑️ Delete Account Requests"
        subtitle="Google Play & App Store policy compliance · GH-DPA data erasure"
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => window.open("/api/admin/delete-account-requests/export", "_blank")}
        >
          📥 Export Log
        </button>
        <button
          className="btn btn-secondary btn-sm font-black uppercase tracking-widest text-[9px]"
          onClick={copyPublicLink}
        >
          Copy Public Link
        </button>
        <button
          className="btn btn-primary btn-sm text-white font-black uppercase tracking-widest text-[9px]"
          onClick={() => setManualOpen(true)}
        >
          + Manual Entry
        </button>
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
          {tabsConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none whitespace-nowrap",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="all">
            <AllRequestsTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pending">
            <AllRequestsTab statusFilter="pending_review" />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="grace">
            <AllRequestsTab statusFilter="grace_period" />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="completed">
            <AllRequestsTab statusFilter="completed" />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="settings">
            <SettingsPolicyTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Manual entry modal */}
      {manualOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setManualOpen(false)}
        >
          <div
            className="bg-white rounded-[13px] w-[440px] max-w-full shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-slate-900 mb-1">🗑️ Manual Deletion Entry</h3>
            <p className="text-[10px] text-slate-400 font-bold mb-4">
              Record a request received out-of-band (support call, letter). Requires an existing account email.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">User Email *</label>
                <input
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Reason</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  rows={3}
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Why did the user request deletion?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-secondary text-xs" onClick={() => setManualOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary text-white text-xs"
                disabled={!manualEmail || manualMutation.isPending}
                onClick={submitManualEntry}
              >
                📋 Record Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountRequestPage;
