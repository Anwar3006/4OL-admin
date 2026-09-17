"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { useMedEnquiryOverview } from "@/features/medenquiry/data/useMedEnquiry";
import { STATUS_LABELS, TYPE_LABELS, formatEnqId, formatSubmittedAt } from "./medEnquiryColumns";
import FacilityViewDialog from "@/features/facilities/ui/view-facility-dialog";
import AllEnquiriesTab from "./AllEnquiriesTab";
import PendingEnquiriesTab from "./PendingEnquiriesTab";
import EscrowTab from "./EscrowTab";
import DeliveryTab from "./DeliveryTab";
import PharmacyResponsesTab from "./PharmacyResponsesTab";
import DisputesTab from "./DisputesTab";
import { formatCurrency } from "@/lib/format";

const CONNECTED_MENUS = [
  { label: "🏥 Pharmacies (Facilities)", href: "/facilities" },
  { label: "🧑‍⚕️ HCP Prescribers", href: "/hcp" },
  { label: "👤 Users", href: "/users" },
  { label: "🔒 Escrow Transactions", href: "/transactions?tab=recent" },
  { label: "🔔 Enquiry Notifications", href: "/notifications" },
  { label: "🏢 IBP Wholesalers", href: "/ibp" },
];

const BUSINESS_LOGIC = [
  {
    title: "📋 Free Tier",
    body: "Submit enquiry (with/without prescription) · Receive multiple pharmacy responses · Price comparison table",
  },
  {
    title: "💎 Premium",
    body: "Priority matching · Verified pharmacies only · Faster response SLA · Notify preferred pharmacy · HCP prescription integration",
  },
  {
    title: "🔒 Escrow Payment",
    body: "User pays via app into escrow · Funds held until pickup/delivery confirmed · Released to pharmacy on confirmation · Dispute resolution by admin",
  },
  {
    title: "🚚 Pickup / Delivery",
    body: "Pickup: user selects pharmacy · Confirmation code sent · Delivery: pharmacy delivers to GPS location · Real-time tracking",
  },
];

export default function MedEnquiryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  // ?pharmacy=<facility_id> arrives from the Facilities menu cross-link.
  const pharmacyParam = searchParams.get("pharmacy");
  // URL is the single source of truth; handleTabChange pushes the new tab param.
  const activeTab = tabParam || "all";
  const [exporting, setExporting] = useState(false);
  const { data: overviewData } = useMedEnquiryOverview();
  const kpis = overviewData?.overview?.kpis;
  const empty = Boolean(overviewData?.empty);

  const TabsConfig = [
    { id: "all", label: "🔬 All Enquiries" },
    {
      id: "pending",
      label: kpis?.pending_unmatched ? `⏳ Pending (${kpis.pending_unmatched})` : "⏳ Pending",
    },
    {
      id: "escrow",
      label: kpis?.escrow_active_count ? `🔒 Escrow (${kpis.escrow_active_count})` : "🔒 Escrow",
    },
    {
      id: "delivery",
      label: kpis?.delivery_in_progress ? `🚚 Delivery (${kpis.delivery_in_progress})` : "🚚 Delivery",
    },
    { id: "pharmacies", label: "💊 Pharmacy Responses" },
    {
      id: "disputes",
      label: kpis?.open_disputes ? `⚖️ Disputes (${kpis.open_disputes})` : "⚖️ Disputes",
    },
  ];

  const handleTabChange = (value: string) => {
    // Preserve the Facilities cross-link (?pharmacy=<id>) across tab switches.
    const params = new URLSearchParams();
    if (value !== "all") params.set("tab", value);
    if (pharmacyParam) params.set("pharmacy", pharmacyParam);
    const qs = params.toString();
    router.push(qs ? `/medenquiry?${qs}` : "/medenquiry", { scroll: false });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await apiFetch<{ rows: any[] }>("/api/medenquiry?limit=100");
      downloadCsv(
        (result.rows ?? []).map((row) => ({
          enquiry: formatEnqId(row.id),
          medication: row.medication_name,
          type: TYPE_LABELS[row.enquiry_type ?? "otc"] ?? row.enquiry_type,
          submitted_by: row.submitter_name,
          responses: row.response_count,
          best_price: row.best_price ?? "",
          fulfilment: row.fulfilment_mode,
          status: STATUS_LABELS[row.status] ?? row.status,
          submitted: formatSubmittedAt(row.created_at),
        })),
        "medication-enquiries-report",
      );
    } catch {
      toast.error("Export failed — check your permissions or try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🔬 Medication Enquiry"
        subtitle="Users & HCPs submit prescription enquiries · Pharmacies/Wholesalers respond with price & availability · Price comparison & delivery"
      >
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-secondary btn-sm disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "📥 Export"}
          </button>
        </div>
      </PageHeader>

      {/* Business logic banner */}
      <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-[#1e3a5f] to-blue-600">
        <div className="text-sm font-black mb-3">📋 Medication Enquiry — Business Logic</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {BUSINESS_LOGIC.map((panel) => (
            <div key={panel.title} className="rounded-xl bg-white/10 dark:bg-slate-800/10 px-3 py-2.5">
              <div className="text-xs font-black mb-1">{panel.title}</div>
              <div className="text-2xs font-medium text-white/85 leading-relaxed">{panel.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected menus */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-4 py-3">
        <span className="text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          Connected Menus:
        </span>
        {CONNECTED_MENUS.map((chip) => (
          <button
            key={chip.href}
            onClick={() => router.push(chip.href)}
            className="h-7 px-3 rounded-full border border-emerald-200 bg-white dark:bg-slate-800 text-2xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/*
        get_med_enquiry_overview returns a single-point-in-time aggregate
        (supabase/migrations/20260822_med_enquiry_depth.sql) — no history
        retained, so there's nothing genuine to chart here. AllEnquiriesTab
        below does fetch dated rows, but as its own paginated request
        (capped, filterable by the admin) that isn't already loaded
        alongside these KPIs, so it can't back a trustworthy trend either.
        Total volume and the pending backlog are what an admin needs to see
        first, so they stay full weight; escrow detail and the match-rate
        summary are secondary, sized down instead of inflated to match.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon="📊"
          label="Total Enquiries (30d)"
          value={kpis?.total_enquiries_30d ?? "—"}
          delta={kpis?.new_this_week ? `↑ +${kpis.new_this_week} this week` : undefined}
          deltaType="up"
          variant="blue"
          isEmpty={empty}
          emptyLabel="Pending migration"
        />
        <KpiCard
          icon="⏳"
          label="Pending / Unmatched"
          value={kpis?.pending_unmatched ?? "—"}
          delta={kpis?.pending_unmatched ? "Needs attention" : undefined}
          deltaType="down"
          variant="amber"
          isEmpty={empty}
          emptyLabel="Pending migration"
        />
        <KpiCard
          icon="🔒"
          label="Escrow Active"
          value={kpis?.escrow_active_count ?? "—"}
          delta={
            kpis?.escrow_amount_held !== undefined
              ? `${formatCurrency(kpis.escrow_amount_held)} held`
              : undefined
          }
          deltaType="neutral"
          variant="indigo"
          isEmpty={empty}
          emptyLabel="Pending migration"
          size="sm"
        />
        <KpiCard
          icon="✅"
          label="Match Rate"
          value={kpis?.match_rate_pct !== undefined ? `${kpis.match_rate_pct}%` : "—"}
          variant="green"
          isEmpty={empty}
          emptyLabel="Pending migration"
          size="sm"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 dark:border-slate-700 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TabsConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark",
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="all">
            <AllEnquiriesTab pharmacyId={pharmacyParam} />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pending">
            <PendingEnquiriesTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="escrow">
            <EscrowTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="delivery">
            <DeliveryTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pharmacies">
            <PharmacyResponsesTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="disputes">
            <DisputesTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Shared Facilities profile dialog — pharmacy names across this menu
          open the same rich profile used by the Facilities menu. */}
      <FacilityViewDialog />
    </div>
  );
}
