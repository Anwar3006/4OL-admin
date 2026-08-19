"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Minus, Save, Trash2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { ADMIN_ROLES, SUPER_ADMIN_ROLE } from "@/lib/admin-roles";
import { usePermissionContext } from "@/stores/permission-context";

interface PlatformRole {
  role: string;
  label: string;
  description: string | null;
  is_super: boolean;
}

interface RbacPayload {
  roles: PlatformRole[];
  rolePermissions: { role: string; permission_key: string }[];
  overrides: {
    user_id: string;
    permission_key: string;
    effect: "grant" | "revoke";
    reason: string | null;
    created_at: string;
  }[];
}

const PERMISSION_RESOURCES = Array.from(
  new Set(PERMISSION_CATALOG.map((p) => p.resource)),
);

export default function RolesPermissionsTab() {
  const { hasPermission } = usePermissionContext();
  const canEdit = hasPermission("roles.edit");

  const [payload, setPayload] = useState<RbacPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("admin");
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Override form state
  const [ovUserId, setOvUserId] = useState("");
  const [ovKey, setOvKey] = useState(PERMISSION_CATALOG[0].key);
  const [ovEffect, setOvEffect] = useState<"grant" | "revoke">("grant");
  const [ovReason, setOvReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/rbac");
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setLoadError(body?.error ?? `Failed to load RBAC matrix (HTTP ${res.status}).`);
      return;
    }
    setPayload(await res.json());
    setLoadError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load the selected role's defaults into the draft set.
  useEffect(() => {
    if (!payload) return;
    const keys = payload.rolePermissions
      .filter((rp) => rp.role === selectedRole)
      .map((rp) => rp.permission_key);
    setDraft(new Set(keys));
    setDirty(false);
  }, [payload, selectedRole]);

  const roles: PlatformRole[] = useMemo(() => {
    if (payload?.roles?.length) return payload.roles.filter((r) => !r.is_super);
    return ADMIN_ROLES.filter((r) => r !== SUPER_ADMIN_ROLE).map((role) => ({
      role,
      label: role.replace(/_/g, " "),
      description: null,
      is_super: false,
    }));
  }, [payload]);

  const toggle = (key: string) => {
    if (!canEdit) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setDirty(true);
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/rbac", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: selectedRole, permissionKeys: Array.from(draft) }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMessage(body?.error ?? "Failed to save role defaults.");
      return;
    }
    setDirty(false);
    setMessage("Saved.");
    load();
  };

  const addOverride = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/rbac/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: ovUserId.trim(),
        permissionKey: ovKey,
        effect: ovEffect,
        reason: ovReason.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMessage(body?.error ?? "Failed to save override.");
      return;
    }
    setMessage("Override saved.");
    setOvUserId("");
    setOvReason("");
    load();
  };

  const removeOverride = async (userId: string, permissionKey: string) => {
    setMessage(null);
    const params = new URLSearchParams({ userId, permissionKey });
    const res = await fetch(`/api/admin/rbac/overrides?${params}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMessage(body?.error ?? "Failed to remove override.");
      return;
    }
    load();
  };

  if (loadError) {
    return (
      <div className="card p-6 flex items-start gap-3 border-amber-200 bg-amber-50">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-[12px] text-amber-800 font-medium leading-relaxed">
          <p className="font-black mb-1">RBAC matrix unavailable</p>
          <p>{loadError}</p>
          <p className="mt-2 text-amber-700/80">
            Run <code className="bg-amber-100 px-1 rounded">supabase/migrations/20260817_rbac_permission_catalog.sql</code>{" "}
            against the database, then reload this tab.
          </p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return <div className="card p-6 text-[11px] text-slate-400 font-bold">Loading RBAC matrix…</div>;
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Role selector */}
      <div className="flex flex-wrap items-center gap-2">
        {roles.map((role) => (
          <button
            key={role.role}
            type="button"
            onClick={() => setSelectedRole(role.role)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[11px] font-black border transition-colors",
              selectedRole === role.role
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400",
            )}
            title={role.description ?? undefined}
          >
            {role.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          {canEdit ? "Editing enabled" : "Read-only (requires roles.edit)"}
        </span>
      </div>

      {/* Permission matrix for the selected role */}
      <div className="card overflow-hidden p-0">
        <div className="card-header border-b border-slate-100 flex justify-between items-center gap-3 flex-wrap">
          <h2 className="card-title text-[13px]">
            🛡️ Default permissions — {roles.find((r) => r.role === selectedRole)?.label ?? selectedRole}
          </h2>
          <div className="flex items-center gap-2">
            {message && <span className="text-[11px] font-bold text-slate-500">{message}</span>}
            {canEdit && (
              <button
                type="button"
                onClick={save}
                disabled={!dirty || saving}
                className={cn(
                  "btn btn-primary text-white text-[11px] flex items-center gap-1.5",
                  (!dirty || saving) && "opacity-40 cursor-not-allowed",
                )}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save defaults"}
              </button>
            )}
          </div>
        </div>
        <p className="px-4 pt-3 text-[10px] text-slate-400 font-bold leading-relaxed">
          Super Admin bypasses the catalog entirely and is not editable. Per-user grants and
          revokes (below) layer on top of these defaults; revokes always win.
        </p>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {PERMISSION_RESOURCES.map((resource) => {
            const defs = PERMISSION_CATALOG.filter((p) => p.resource === resource);
            return (
              <div key={resource} className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {resource}
                </div>
                <div className="divide-y divide-slate-50">
                  {defs.map((def) => {
                    const checked = draft.has(def.key);
                    return (
                      <button
                        key={def.key}
                        type="button"
                        onClick={() => toggle(def.key)}
                        disabled={!canEdit}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                          canEdit ? "hover:bg-slate-50 cursor-pointer" : "cursor-default",
                        )}
                        title={def.description}
                      >
                        {checked ? (
                          <Check className="w-3.5 h-3.5 text-ek-green-dark shrink-0" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                        )}
                        <span className="text-[11px] font-bold text-slate-700">{def.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-user overrides */}
      <div className="card overflow-hidden p-0">
        <div className="card-header border-b border-slate-100">
          <h2 className="card-title text-[13px]">🎯 Per-user overrides</h2>
        </div>
        <div className="p-4 space-y-4">
          {canEdit && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                User ID (uuid)
                <input
                  value={ovUserId}
                  onChange={(e) => setOvUserId(e.target.value)}
                  placeholder="00000000-0000-…"
                  className="input text-[11px] font-medium normal-case tracking-normal w-64"
                />
              </label>
              <label className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                Permission
                <select
                  value={ovKey}
                  onChange={(e) => setOvKey(e.target.value)}
                  className="input text-[11px] font-medium normal-case tracking-normal w-56"
                >
                  {PERMISSION_CATALOG.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.key}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                Effect
                <select
                  value={ovEffect}
                  onChange={(e) => setOvEffect(e.target.value as "grant" | "revoke")}
                  className="input text-[11px] font-medium normal-case tracking-normal w-28"
                >
                  <option value="grant">grant</option>
                  <option value="revoke">revoke</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                Reason (optional)
                <input
                  value={ovReason}
                  onChange={(e) => setOvReason(e.target.value)}
                  className="input text-[11px] font-medium normal-case tracking-normal w-56"
                />
              </label>
              <button type="button" onClick={addOverride} className="btn btn-secondary text-[11px]">
                Add override
              </button>
            </div>
          )}

          {payload.overrides.length === 0 ? (
            <p className="text-[11px] text-slate-400 font-bold">No per-user overrides configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-bold text-slate-600 border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[9px]">
                  <tr>
                    <th className="p-3 font-black text-left">User</th>
                    <th className="p-3 font-black text-left">Permission</th>
                    <th className="p-3 font-black text-left">Effect</th>
                    <th className="p-3 font-black text-left">Reason</th>
                    {canEdit && <th className="p-3 font-black text-right">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payload.overrides.map((ov) => (
                    <tr key={`${ov.user_id}:${ov.permission_key}`}>
                      <td className="p-3 font-mono text-[10px]">{ov.user_id.slice(0, 8)}…</td>
                      <td className="p-3">{ov.permission_key}</td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "badge text-[9px] font-black",
                            ov.effect === "grant"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700",
                          )}
                        >
                          {ov.effect}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{ov.reason ?? "—"}</td>
                      {canEdit && (
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeOverride(ov.user_id, ov.permission_key)}
                            className="text-red-400 hover:text-red-600"
                            aria-label="Remove override"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
