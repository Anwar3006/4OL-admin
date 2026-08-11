import React from "react";

export default function TaxVATTab() {
  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="card-title text-xs mb-4">🧾 GRA Tax Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">VAT Collected (Q2)</span>
                <span className="text-slate-900 font-black">₵24,820.45</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">NHIL (2.5%)</span>
                <span className="text-slate-900 font-black">₵3,570.50</span>
            </div>
            <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2">
                <span className="text-slate-500 font-medium">GETFund (2.5%)</span>
                <span className="text-slate-900 font-black">₵3,570.50</span>
            </div>
            <div className="flex justify-between text-xs font-black pt-2">
                <span className="text-slate-800">Total Tax Payable</span>
                <span className="text-red-600">₵31,961.45</span>
            </div>
          </div>
          <button className="btn btn-primary w-full mt-6 text-white font-black uppercase text-[10px] tracking-widest">Generate GRA Report</button>
        </div>
        <div className="md:col-span-2 card bg-slate-50 border-dashed border-slate-200 flex items-center justify-center py-20">
            <div className="text-center">
                <div className="text-3xl mb-2">⚖️</div>
                <h3 className="font-black text-slate-400 uppercase tracking-widest text-sm">Compliance Dashboard coming soon</h3>
            </div>
        </div>
      </div>
    </div>
  );
}
