"use client";

import React from "react";
import { downloadCsv } from "@/lib/csv";
import {
  useTaxData,
  useUpdateTaxFiling,
  type TaxFilingRow,
} from "@/hooks/supabase-calls/useTransactions";

const FILING_BADGES: Record<TaxFilingRow["status"], string> = {
  filed: "badge-green",
  in_progress: "badge-amber",
  not_started: "badge-secondary",
};

const money = (value: unknown) =>
  value === null || value === undefined ? "—" : `₵${Number(value).toLocaleString()}`;

export default function TaxVATTab() {
  const { data, isLoading } = useTaxData();
  const updateFiling = useUpdateTaxFiling();

  const summary = data?.summary ?? null;
  const hidden = Boolean(data?.summary_hidden);

  const handleDownloadReport = () => {
    if (!summary) return;
    downloadCsv(
      [
        { item: "Subscription revenue (taxable base)", amount: summary.subscription_base },
        { item: `VAT (${summary.vat_pct}%)`, amount: summary.vat },
        { item: `NHIL (${summary.nhil_pct}%)`, amount: summary.nhil },
        { item: `GETFund (${summary.getfund_pct}%)`, amount: summary.getfund },
        { item: "Total consumption taxes (17.5%)", amount: summary.total_consumption_tax },
        { item: "Service fee revenue (income base)", amount: summary.service_fee_base },
        { item: `Corporate income tax (${summary.income_tax_pct}%)`, amount: summary.income_tax },
        { item: "Net revenue after consumption taxes", amount: summary.net_revenue },
      ],
      "gra-tax-report",
    );
  };

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="card-title text-xs mb-4">🧾 GRA Tax Summary (computed from ledger)</h2>
          {hidden ? (
            <div className="py-8 text-center">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Hidden by Super Admin
              </p>
            </div>
          ) : isLoading || !summary ? (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-8 text-center">
              Loading tax summary…
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">VAT ({summary.vat_pct}%)</span>
                  <span className="text-slate-900 font-black">{money(summary.vat)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">NHIL ({summary.nhil_pct}%)</span>
                  <span className="text-slate-900 font-black">{money(summary.nhil)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">GETFund ({summary.getfund_pct}%)</span>
                  <span className="text-slate-900 font-black">{money(summary.getfund)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                  <span className="text-slate-500 font-medium">
                    Income Tax ({summary.income_tax_pct}% of service fees)
                  </span>
                  <span className="text-slate-900 font-black">{money(summary.income_tax)}</span>
                </div>
                <div className="flex justify-between text-xs font-black pt-2">
                  <span className="text-slate-800">Total Consumption Tax Payable</span>
                  <span className="text-red-600">{money(summary.total_consumption_tax)}</span>
                </div>
              </div>
              <button
                onClick={handleDownloadReport}
                className="btn btn-primary w-full mt-6 text-white font-black uppercase text-[10px] tracking-widest"
              >
                Generate GRA Report
              </button>
            </>
          )}
        </div>

        <div className="md:col-span-2 card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-xs">📅 Quarterly Filing Schedule</h2>
            <span className="badge badge-secondary">GRA TIN: {data?.tin ?? "—"}</span>
          </div>
          <div className="space-y-2">
            {(data?.filings ?? []).map((filing) => (
              <div
                key={filing.id}
                className="flex flex-wrap items-center justify-between gap-2 border border-slate-100 rounded-xl p-3"
              >
                <div>
                  <div className="text-xs font-black text-slate-800">{filing.period}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Due {filing.due_date ?? "—"} · Remitted {money(filing.remitted_amount)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${FILING_BADGES[filing.status]}`}>
                    {filing.status.replace("_", " ")}
                  </span>
                  {filing.status !== "filed" && (
                    <button
                      disabled={updateFiling.isPending}
                      onClick={() =>
                        updateFiling.mutate({ filing_id: filing.id, status: "filed" })
                      }
                      className="h-7 px-2 rounded-lg border border-emerald-200 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Mark Filed
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(data?.filings ?? []).length === 0 && !isLoading && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-6 text-center">
                No filings scheduled yet.
              </p>
            )}
          </div>
          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest mt-4">
            VAT 12.5% + NHIL 2.5% + GETFund 2.5% = 17.5% consumption tax · Corporate income tax 25%
          </p>
        </div>
      </div>
    </div>
  );
}
