"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  Crown,
  Package,
  Ban,
} from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHasPermission } from "@/stores/permission-context";
import { useIbpOverview } from "@/features/ibp/data/useIBP";
import AllIbpsTab from "./AllIbpsTab";
import PendingIbpsTab from "./PendingIbpsTab";
import ActiveIbpsTab from "./ActiveIbpsTab";
import PremiumIbpsTab from "./PremiumIbpsTab";
import IbpProductsTab from "./IbpProductsTab";
import SuspendedIbpsTab from "./SuspendedIbpsTab";
import RegisterIbpDialog from "./RegisterIbpDialog";
import { cn } from "@/lib/utils";

const IbpTabs = [
  { id: "all", label: "🏢 All IBPs" },
  { id: "pending", label: "🕵️ Pending Verification" },
  { id: "active", label: "✅ Active" },
  { id: "premium", label: "⭐ Premium" },
  { id: "products", label: "📦 Products" },
  { id: "suspended", label: "⏸️ Suspended" },
];

export default function IBPPage() {
  const searchParams = useSearchParams();
  const canEdit = useHasPermission("ibp.edit");
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const overview = useIbpOverview();
  const stats = overview.data?.stats;

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
        title="🏢 IBP Businesses"
        subtitle="Individual Business Providers — registration, verification, products and campaigns"
      >
        {canEdit && (
          <button className="btn btn-primary text-white" onClick={() => setRegisterOpen(true)}>
            ➕ Register IBP
          </button>
        )}
      </PageHeader>

      <div className="alert al-ic flex items-start gap-3">
        <span>🏛️</span>
        <div className="text-xs leading-relaxed">
          <strong>Policy.</strong> Health facilities (pharmacies, gyms, clinics,
          labs, etc.) register via the Facilities module — IBP covers
          non-facility health businesses. Verification requires a valid RGD
          registration number; Super Admin connectivity to the mobile app is
          live once a business is published.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={<Building2 className="h-5 w-5" />}
          label="Total IBPs"
          value={stats?.total ?? "..."}
          variant="blue"
          delta="Registered businesses"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Active / Published"
          value={stats?.active_published ?? "..."}
          variant="green"
          delta="Live in mobile app"
          deltaType="up"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Verification"
          value={stats?.pending_verification ?? "..."}
          variant="amber"
          delta="Awaiting review"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<Crown className="h-5 w-5" />}
          label="Premium / Featured"
          value={stats?.premium ?? "..."}
          variant="purple"
          delta="Featured flag"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<Package className="h-5 w-5" />}
          label="Products Pending"
          value={stats?.products_pending ?? "..."}
          variant="teal"
          delta={`${stats?.products_published ?? 0} published`}
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
        <KpiCard
          icon={<Ban className="h-5 w-5" />}
          label="Suspended"
          value={stats?.suspended ?? "..."}
          variant="red"
          delta="Hidden from app"
          deltaType="neutral"
          isLoading={overview.isLoading}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {IbpTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/15/40",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  "data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
                )}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="all"><AllIbpsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="pending"><PendingIbpsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="active"><ActiveIbpsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="premium"><PremiumIbpsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="products"><IbpProductsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="suspended"><SuspendedIbpsTab /></TabsContent>
        </div>
      </Tabs>

      <RegisterIbpDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </div>
  );
}
