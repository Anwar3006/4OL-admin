"use client";

import React from "react";
import { Lock } from "lucide-react";

/**
 * Read-only until D12 (PLAN.md: escrow/order payments on hold pending boss
 * approval). There's no payout data model wired up yet — the ledger tables
 * (escrow_transactions, transactions, refunds, service_charge_rates) stay
 * unchanged until then, so there is nothing to query here.
 */
const PayoutsTab = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-2">
    <Lock className="h-6 w-6 mx-auto text-slate-400" />
    <div className="text-xs font-black uppercase tracking-widest text-slate-500">Payouts are on hold</div>
    <p className="text-xs text-slate-400 max-w-sm mx-auto">
      Escrow and order payments are blocked pending approval (PLAN.md decision D12). Nothing moves money yet, so
      there is nothing to show here — this tab activates once D12 unblocks P1-03/order fulfilment.
    </p>
  </div>
);

export default PayoutsTab;
