"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type SecuritySettings = {
  mfa_required: boolean;
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
  session_timeout_mins: number;
  ai_audit_logging: boolean;
  geo_restriction_enabled: boolean;
};

/**
 * Settings → Security tab (Gap Analysis Part P).
 * Reads/writes /api/settings/security (settings.security — super_admin only
 * in ROLE_DEFAULTS). The server enforces the P-D4 self-lockout guard: a
 * whitelist that excludes the acting admin's own IP is rejected.
 */
export default function SecurityTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [form, setForm] = useState<SecuritySettings | null>(null);
  const [whitelistText, setWhitelistText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setDenied(null);
    try {
      const res = await fetch("/api/settings/security", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setDenied("Only super admins can view security settings.");
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to load security settings.");
      setForm(json.security);
      setWhitelistText((json.security.ip_whitelist ?? []).join("\n"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load security settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const ip_whitelist = whitelistText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const res = await fetch("/api/settings/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ip_whitelist }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to save security settings.");
      setForm(json.security);
      setWhitelistText((json.security.ip_whitelist ?? []).join("\n"));
      toast.success("Security settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save security settings.");
    } finally {
      setSaving(false);
    }
  };

  if (denied) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Restricted</AlertTitle>
        <AlertDescription>{denied}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
        Loading security settings...
      </div>
    );
  }

  if (!form) return null;

  const toggle = (key: keyof SecuritySettings) => (checked: boolean) =>
    setForm((current) => (current ? { ...current, [key]: checked } : current));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Authentication & Access
          </CardTitle>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            title="Require MFA for all admins"
            description="Every admin session must complete multi-factor authentication."
            checked={form.mfa_required}
            onChange={toggle("mfa_required")}
          />
          <ToggleRow
            title="Enforce IP whitelist"
            description="Only IPs inside the CIDR ranges below can sign in to the admin panel."
            checked={form.ip_whitelist_enabled}
            onChange={toggle("ip_whitelist_enabled")}
          />
          {form.ip_whitelist_enabled && (
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                CIDR ranges — one per line (e.g. 196.32.10.0/24)
              </div>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={whitelistText}
                onChange={(event) => setWhitelistText(event.target.value)}
                placeholder={"196.32.10.0/24\n41.215.176.0/20"}
              />
              <div className="mt-2 text-[11px] text-slate-400">
                Saving is rejected if your own IP falls outside the list, so you
                can never lock yourself out.
              </div>
            </div>
          )}
          <ToggleRow
            title="AI audit logging"
            description="Record every AI-generated content action in the audit trail."
            checked={form.ai_audit_logging}
            onChange={toggle("ai_audit_logging")}
          />
          <ToggleRow
            title="Geo-restriction"
            description="Limit admin sign-ins to Ghana and approved regions."
            checked={form.geo_restriction_enabled}
            onChange={toggle("geo_restriction_enabled")}
          />
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-100">Session timeout</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Idle admin sessions expire after this many minutes (5–720).
              </div>
            </div>
            <Input
              type="number"
              min={5}
              max={720}
              className="w-28 text-right tabular-nums"
              value={form.session_timeout_mins}
              onChange={(event) => {
                const value = Number(event.target.value);
                setForm((current) =>
                  current
                    ? {
                        ...current,
                        session_timeout_mins: Number.isFinite(value) ? value : current.session_timeout_mins,
                      }
                    : current,
                );
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <div>
        <div className="font-medium text-slate-800 dark:text-slate-100">{title}</div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
    </div>
  );
}
