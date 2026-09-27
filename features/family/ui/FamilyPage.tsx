"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FamilyLinksTab from "./FamilyLinksTab";
import ConsentAuditTab from "./ConsentAuditTab";
import PremiumOverridesTab from "./PremiumOverridesTab";
import { useFamilyKpi } from "../data/useFamily";
import { cn } from "@/lib/utils";

// AF-01 — Family Care Circle admin surface (RBAC-gated: family.view).
// Route entry: app/(dashboard)/family/page.tsx re-exports this component.

const TabsConfig = [
  { id: "links", label: "👪 Family Links" },
  { id: "consent", label: "🔐 Consent Audit" },
  { id: "overrides", label: "🎟️ Premium Overrides" },
];

function FamilyStats() {
  const { data, isLoading } = useFamilyKpi();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <KpiCard
        icon="👪"
        label="Active Circles"
        value={isLoading ? "..." : (data?.active_circles ?? 0).toLocaleString()}
        variant="blue"
        delta={`${data?.total_dependents ?? 0} dependents total`}
        deltaType="neutral"
      />
      <KpiCard
        icon="🧓"
        label="Profile-Only"
        value={isLoading ? "..." : (data?.profile_only ?? 0).toLocaleString()}
        variant="teal"
        delta="No account / caregiver device"
        deltaType="neutral"
        size="sm"
      />
      <KpiCard
        icon="🔗"
        label="Linked Accounts"
        value={isLoading ? "..." : (data?.linked_accounts ?? 0).toLocaleString()}
        variant="gold"
        delta={`${data?.live_scopes ?? 0} live scopes`}
        deltaType="neutral"
        size="sm"
      />
      <KpiCard
        icon="🛡️"
        label="Revocation Rate"
        value={isLoading ? "..." : `${data?.revocation_rate ?? 0}%`}
        variant="green"
        delta="Trust health metric"
        deltaType="neutral"
      />
    </div>
  );
}

const FamilyPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "links");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) setActiveTab(tabParam);
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/family?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="👪 Family Circle"
        subtitle="Caregiver ↔ dependent care circles · consent scopes · premium limits"
      />

      <FamilyStats />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 mb-5 w-full overflow-hidden">
          <TabsList
            className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
          >
            {TabsConfig.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 sm:px-5 py-2.5 sm:py-3",
                  "text-2xs sm:text-xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent",
                  "transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50/40",
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
          <TabsContent className="w-full min-w-0 outline-none" value="links">
            <FamilyLinksTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="consent">
            <ConsentAuditTab />
          </TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="overrides">
            <PremiumOverridesTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default FamilyPage;
