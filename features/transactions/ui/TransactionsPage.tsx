"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PageHeader from "@/components/redesign/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionStats from "./TransactionStats";
import RevenueAnalytics from "./RevenueAnalytics";
import PaymentMethods from "./PaymentMethods";
import RecentTransactionsTab from "./RecentTransactionsTab";
import ServiceChargeTab from "./ServiceChargeTab";
import SubscriptionsTab from "./SubscriptionsTab";
import FailedTransactionsTab from "./FailedTransactionsTab";
import RefundsTab from "./RefundsTab";
import TaxVATTab from "./TaxVATTab";
import ExpensesTab from "./ExpensesTab";
import { CATEGORY_LABELS, formatProcessedAt } from "./transactionColumns";
import { downloadCsv } from "@/lib/csv";
import { apiFetch } from "@/lib/api-fetch";
import { useTransactionsOverview, type TransactionRow } from "@/features/transactions/data/useTransactions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TransactionsPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  // URL is the single source of truth; handleTabChange pushes the new tab param.
  const activeTab = tabParam || "recent";
  const [exporting, setExporting] = useState(false);
  const { data: overview } = useTransactionsOverview();
  const failedCount = overview?.overview?.failed?.count ?? 0;

  const TransTabs = [
    { id: "recent", label: "💳 Recent" },
    { id: "service-charge", label: "💹 Service Charge %" },
    { id: "subscriptions", label: "💎 Subscriptions" },
    { id: "failed", label: failedCount > 0 ? `❌ Failed (${failedCount})` : "❌ Failed" },
    { id: "refunds", label: "🔄 Refunds" },
    { id: "tax-vat", label: "🧾 Tax & VAT" },
    { id: "expenses", label: "💰 Expenses (SA Only)" },
  ];

  const handleTabChange = (value: string) => {
    router.push(`/transactions?tab=${value}`, { scroll: false });
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const result = await apiFetch<{ rows: TransactionRow[] }>("/api/transactions?limit=100");
      downloadCsv(
        (result.rows ?? []).map((row) => ({
          reference: row.reference,
          amount: row.amount,
          payer: row.payer_name,
          payer_code: row.payer_code,
          segment: row.payer_class,
          category: CATEGORY_LABELS[row.category] ?? row.category,
          method: row.payment_method,
          date: formatProcessedAt(row.processed_at),
          status: row.status,
        })),
        "transactions-report",
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
        title="💳 Transactions"
        subtitle="Track your business performance and analytics across all channels"
      >
        <div className="flex gap-2">
            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="btn btn-secondary btn-sm disabled:opacity-50"
            >
              {exporting ? "Exporting…" : "📥 Export Report"}
            </button>
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
        <TabsList className="bg-transparent border-b border-slate-200 dark:border-slate-700 h-auto p-0 flex gap-0 mb-4 justify-start overflow-x-auto no-scrollbar">
          {TransTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none",
                "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-ek-green-dark data-[state=active]:border-ek-green-dark"
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="animate-in slide-in-from-bottom-2 duration-300">
          <TabsContent className="w-full min-w-0 outline-none" value="recent"><RecentTransactionsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="service-charge"><ServiceChargeTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="failed"><FailedTransactionsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="refunds"><RefundsTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="tax-vat"><TaxVATTab /></TabsContent>
          <TabsContent className="w-full min-w-0 outline-none" value="expenses"><ExpensesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TransactionsPage;
