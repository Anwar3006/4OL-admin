"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/Data-Table/data-table";
import { formatCurrency } from "@/lib/format";
import {
  transactionColumns,
  formatProcessedAt,
} from "./transactionColumns";
import {
  useServiceRates,
  useUpdateServiceRates,
  useTransactions,
  useTransactionsOverview,
} from "@/features/transactions/data/useTransactions";

const RATE_ICONS: Record<string, string> = {
  med_enquiry: "💊",
  facility_booking: "🏥",
  ibp_product_sale: "💰",
  marketing_campaign: "📢",
  delivery_escrow: "🚚",
  jobs_premium_post: "📋",
};

export default function ServiceChargeTab() {
  const { data: ratesData, isLoading: ratesLoading } = useServiceRates();
  const saveRates = useUpdateServiceRates();
  const { data: overview } = useTransactionsOverview();
  const { data: feeTxns, isLoading: txnsLoading } = useTransactions({
    category: "service_fee",
    limit: 25,
  });

  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const rates = ratesData?.rates ?? [];
  const canEdit = Boolean(ratesData?.can_edit);
  const editable = draft ?? Object.fromEntries(rates.map((r) => [r.key, String(r.rate_pct)]));

  const serviceFees = overview?.overview?.service_fees;

  const handleSave = () => {
    const payload = rates
      .map((r) => ({ key: r.key, rate_pct: parseFloat(editable[r.key] ?? "0") || 0 }))
      .filter((r) => Number.isFinite(r.rate_pct));
    saveRates.mutate(payload, {
      onSuccess: () => setDraft(null),
    });
  };

  const feeColumns = useMemo(() => transactionColumns, []);

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <div className="card-header bg-ek-green/5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center px-4 py-3">
            <h2 className="card-title text-xs">📊 Service Charge Rates</h2>
            {canEdit ? (
              <button
                onClick={handleSave}
                disabled={saveRates.isPending || !draft}
                className="btn btn-primary btn-sm text-2xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {saveRates.isPending ? "Saving…" : "Save Rates"}
              </button>
            ) : (
              <span className="badge badge-secondary text-3xs">SA edits rates</span>
            )}
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/15 p-2 text-2xs font-bold text-amber-700 dark:text-amber-400 border-b border-amber-100 dark:border-amber-500/30 px-4">
            💡 Rate changes apply to all new transactions immediately.
          </div>
          <div className="divide-y divide-slate-50">
            {ratesLoading ? (
              <div className="p-4 text-2xs font-bold text-slate-400 uppercase tracking-widest">Loading rates…</div>
            ) : rates.length === 0 ? (
              <div className="p-4 text-2xs font-bold text-slate-400 uppercase tracking-widest">
                No rates configured yet (apply the transactions ledger migration).
              </div>
            ) : (
              rates.map((r) => (
                <div key={r.key} className="flex justify-between items-center p-3 px-4 text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    {RATE_ICONS[r.key] ?? "💹"} {r.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={editable[r.key] ?? ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...(prev ?? Object.fromEntries(rates.map((x) => [x.key, String(x.rate_pct)]))),
                          [r.key]: e.target.value,
                        }))
                      }
                      className="w-14 h-7 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-black text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-ek-green/20 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header border-b border-slate-100 dark:border-slate-800 mb-4">
            <h2 className="card-title text-xs">📊 Service Fee Revenue (MTD)</h2>
          </div>
          {overview?.overview?.service_fees_hidden ? (
            <div className="py-8 text-center">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
                Hidden by Super Admin
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs font-bold">
                <span className="text-slate-500 font-medium">Service Fee Revenue (MTD)</span>
                <span className="text-ek-blue">
                  {formatCurrency(serviceFees?.total_mtd ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 text-xs font-bold">
                <span className="text-slate-500 font-medium">Year to Date</span>
                <span className="text-ek-blue">
                  {formatCurrency(serviceFees?.ytd ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-slate-100 dark:border-slate-800 text-xs font-black">
                <span className="text-slate-800 dark:text-slate-200">Fee Transactions</span>
                <span className="text-ek-green-dark">{feeTxns?.total ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          columns={feeColumns}
          data={feeTxns?.rows ?? []}
          isLoading={txnsLoading}
        />
        {(feeTxns?.rows ?? []).length === 0 && !txnsLoading && (
          <div className="p-6 text-center text-2xs font-bold text-slate-400 uppercase tracking-widest">
            No service fee transactions recorded yet. Fees appear here once ledger events are captured.
          </div>
        )}
      </div>
      <p className="text-3xs text-slate-300 font-bold uppercase tracking-widest">
        Last updated {rates[0] ? formatProcessedAt(rates[0].updated_at) : "—"}
      </p>
    </div>
  );
}
