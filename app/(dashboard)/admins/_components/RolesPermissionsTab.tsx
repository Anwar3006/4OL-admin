"use client";

import React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminDashboardMetrics } from "@/hooks/supabase-calls/useAdminDashboard";

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  super_admin: { label: "Super Admin", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  admin: { label: "Admin", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  registrar: { label: "Registrar", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
};

// This reflects the ACTUAL authorization checks in the codebase today
// (grepped across actions/user.actions.ts, actions/authenticate.actions.ts,
// lib/admin-api-auth.ts, actions/facility-owner.actions.ts) — not an
// aspirational permission design. There is no per-module permission matrix
// enforced anywhere: every mutating admin action checks
// `["super_admin", "admin"].includes(role)`, and every read-only admin
// surface checks `["super_admin", "admin", "registrar"].includes(role)`.
// Super Admin and Admin currently have IDENTICAL enforced permissions —
// the distinction exists in the `role` enum but nothing in the app treats
// them differently yet. Registrar is genuinely read-only.
const CAPABILITIES = [
  { name: "View all dashboards & reports", registrar: true, admin: true },
  { name: "View facilities, users, content", registrar: true, admin: true },
  { name: "Create / edit / delete users", registrar: false, admin: true },
  { name: "Invite or manage admins", registrar: false, admin: true },
  { name: "Edit facility profiles", registrar: false, admin: true },
  { name: "Moderate flagged content", registrar: false, admin: true },
];

export default function RolesPermissionsTab() {
  const { data, isLoading } = useAdminDashboardMetrics("30d");
  const byRole = data?.admins.by_role ?? {};

  const roles = (["super_admin", "admin", "registrar"] as const).map((key) => ({
    key,
    count: byRole[key] ?? 0,
    ...ROLE_META[key],
  }));

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {roles.map((role) => (
          <div key={role.key} className={cn("card border shadow-sm", role.border, role.bg)}>
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className={cn("font-black text-[12px] uppercase tracking-tight", role.color)}>👑 {role.label}</div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {isLoading ? "…" : `${role.count} account${role.count === 1 ? "" : "s"}`}
                </div>
              </div>
              <span className="badge badge-secondary text-[10px] font-black">{isLoading ? "…" : role.count}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="card-header border-b border-slate-100 flex justify-between items-center">
          <h2 className="card-title text-[13px]">📋 What each role can actually do</h2>
        </div>
        <p className="px-4 pt-3 text-[10px] text-slate-400 font-bold leading-relaxed">
          Sourced directly from this app&apos;s authorization checks. There is no granular
          per-module permission system yet — Super Admin and Admin currently have the same
          enforced access; only Registrar is restricted to read-only.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] font-bold text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px]">
              <tr>
                <th className="p-3 font-black text-left min-w-[200px]">Capability</th>
                <th className="p-3 font-black text-center">Registrar</th>
                <th className="p-3 font-black text-center">Admin / Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CAPABILITIES.map((cap, i) => (
                <tr key={cap.name} className={cn(i % 2 === 0 ? "bg-slate-50/30" : "bg-white")}>
                  <td className="p-3 text-slate-900 font-black">{cap.name}</td>
                  <td className="p-3 text-center">
                    {cap.registrar ? (
                      <Check className="w-4 h-4 text-ek-green-dark inline" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-200 inline" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {cap.admin ? (
                      <Check className="w-4 h-4 text-ek-green-dark inline" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-200 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
