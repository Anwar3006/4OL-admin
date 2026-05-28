"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionStats from "./_components/TransactionStats";
import RevenueAnalytics from "./_components/RevenueAnalytics";
import PaymentMethods from "./_components/PaymentMethods";
import RecentTransactionsTab from "./_components/RecentTransactionsTab";
import ServiceChargeTab from "./_components/ServiceChargeTab";
import SubscriptionsTab from "./_components/SubscriptionsTab";
import FailedTransactionsTab from "./_components/FailedTransactionsTab";
import RefundsTab from "./_components/RefundsTab";
import TaxVATTab from "./_components/TaxVATTab";
import ExpensesTab from "./_components/ExpensesTab";
import { cn } from "@/lib/utils";

const TransTabs = [
  { id: "recent", label: "💳 Recent" },
  { id: "service-charge", label: "💹 Service Charge %" },
  { id: "subscriptions", label: "💎 Subscriptions" },
  { id: "failed", label: "❌ Failed (12)" },
  { id: "refunds", label: "🔄 Refunds (4)" },
  { id: "tax-vat", label: "🧾 Tax & VAT" },
  { id: "expenses", label: "💰 Expenses (SA Only)" },
];

const TransactionsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "recent");

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/transactions?tab=${value}`, { scroll: false });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="💳 Transactions"
        subtitle="Track your business performance and analytics across all channels"
      >
        <div className="flex gap-2">
            <select className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-medium bg-white outline-none">
                <option>📅 Last 30 Days</option>
                <option>Last 7 Days</option>
                <option>This Year</option>
            </select>
            <button className="btn btn-secondary btn-sm">📥 Export Report</button>
        </div>
      </PageHeader>

      <TransactionStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <RevenueAnalytics />
        </div>
        <div>
            <PaymentMethods />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-transparent border-b border-slate-200 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TransTabs.map((tab) => (
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
          <TabsContent value="recent"><RecentTransactionsTab /></TabsContent>
          <TabsContent value="service-charge"><ServiceChargeTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent value="failed"><FailedTransactionsTab /></TabsContent>
          <TabsContent value="refunds"><RefundsTab /></TabsContent>
          <TabsContent value="tax-vat"><TaxVATTab /></TabsContent>
          <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TransactionsPage;
