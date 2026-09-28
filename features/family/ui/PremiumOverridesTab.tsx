"use client";

import React, { useState } from "react";
import { useSetFamilyOverride } from "../data/useFamily";

// AF-01 — Premium Overrides tab: adjust a caregiver's dependent limit
// (reuses the premium grants/settings pattern). family.manage permission.

export default function PremiumOverridesTab() {
  const [caregiver, setCaregiver] = useState("");
  const [max, setMax] = useState(5);
  const [note, setNote] = useState("");
  const override = useSetFamilyOverride();

  const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    caregiver.trim(),
  );

  return (
    <div className="w-full min-w-0 mt-4 max-w-xl">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
            Set dependent limit override
          </h3>
          <p className="text-3xs font-medium text-slate-400 mt-1">
            Overrides the tier default (Free = 1, Premium = 5) for one caregiver
            account. Range 0–50.
          </p>
        </div>

        <label className="block">
          <span className="text-3xs font-black uppercase tracking-widest text-slate-500">
            Caregiver user ID
          </span>
          <input
            value={caregiver}
            onChange={(e) => setCaregiver(e.target.value)}
            placeholder="uuid of the caregiver account"
            className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          {!validUuid && caregiver.length > 0 && (
            <span className="text-3xs font-bold text-rose-500">
              Enter a valid UUID
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-3xs font-black uppercase tracking-widest text-slate-500">
            Max dependents
          </span>
          <input
            type="number"
            min={0}
            max={50}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <label className="block">
          <span className="text-3xs font-black uppercase tracking-widest text-slate-500">
            Note (internal)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. goodwill — large family"
            className="mt-1 w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <button
          disabled={override.isPending || !validUuid || max < 0 || max > 50}
          onClick={() =>
            override.mutate({
              caregiver: caregiver.trim(),
              maxDependents: max,
              note: note || null,
            })
          }
          className="h-10 px-5 rounded-xl text-3xs font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          {override.isPending ? "Saving…" : "💾 Save Override"}
        </button>
      </div>
    </div>
  );
}
