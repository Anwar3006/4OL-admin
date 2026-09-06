"use client";

/**
 * Deletion Settings & Policy tab (Gap Analysis Part Z, Z-D1).
 * Reads platform_settings.deletion_settings through the guarded settings
 * route; saving requires settings.security, so unauthorized roles see the
 * values but not the save control.
 */

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface DeletionSettings {
  grace_days: number;
  otp_expiry_mins: number;
  auto_process: boolean;
  data_download_reminder_days: number;
}

export default function SettingsPolicyTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["deletion-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/deletion-settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load settings");
      return json.settings as DeletionSettings;
    },
  });

  const [form, setForm] = useState<DeletionSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/deletion-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Deletion policy settings saved.");
        setForm(json.settings);
      } else {
        toast.error(json.error ?? "Failed to save settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    !!form &&
    !!data &&
    (form.grace_days !== data.grace_days ||
      form.otp_expiry_mins !== data.otp_expiry_mins ||
      form.auto_process !== data.auto_process ||
      form.data_download_reminder_days !== data.data_download_reminder_days);

  const numberRow = (
    label: string,
    key: keyof Omit<DeletionSettings, "auto_process">,
    suffix: string,
    hint: string,
  ) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-50 gap-4">
      <div>
        <div className="text-[11px] font-bold text-slate-600">{label}</div>
        <div className="text-[9px] text-slate-400 font-medium">{hint}</div>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          className="w-20 h-8 px-2 rounded-lg border border-slate-200 text-xs text-right font-black"
          value={form?.[key] ?? 0}
          onChange={(e) => setForm(form ? { ...form, [key]: Number(e.target.value) } : form)}
        />
        <span className="text-[10px] font-black text-slate-400 uppercase">{suffix}</span>
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-0 space-y-6 mt-4">
      <div className="card">
        <h2 className="card-title text-sm mb-4">⚙️ Deletion Settings & Policy</h2>
        {isLoading || !form ? (
          <div className="py-8 text-center text-slate-400 text-xs font-bold">Loading policy settings…</div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs mb-1">GH-DPA 2012 Compliance</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Section 34 of the Ghana Data Protection Act 2012 requires that personal data be erased upon request within 30 days,
                unless legal or regulatory obligations require retention. Login email erasure in Supabase auth is a separate,
                explicitly-reviewed step (Epic 21 scope note).
              </p>
            </div>

            {numberRow("Grace Period Duration", "grace_days", "days", "Reversible window before anonymization (1–90)")}
            {numberRow("OTP Expiry", "otp_expiry_mins", "mins", "Identity-verification code lifetime (1–60)")}
            {numberRow("Data Download Reminder", "data_download_reminder_days", "days", "Remind users to export data N days into grace (1–30)")}

            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <div>
                <div className="text-[11px] font-bold text-slate-600">Auto-Processing (pg_cron)</div>
                <div className="text-[9px] text-slate-400 font-medium">
                  expire_delete_account_grace_periods() runs daily and reads the grace window above
                </div>
              </div>
              <button
                className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                  form.auto_process
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
                onClick={() => setForm({ ...form, auto_process: !form.auto_process })}
              >
                {form.auto_process ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                className="btn btn-primary btn-sm text-white"
                disabled={!dirty || saving}
                onClick={save}
              >
                {saving ? "Saving…" : "💾 Save Policy Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
