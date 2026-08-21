"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Compliance = {
  gh_dpa_registration_no?: string;
  gh_dpa_dpo_name?: string;
  gh_dpa_dpo_email?: string;
  gh_dpa_retention_policy?: string;
  gra_tin?: string;
  gra_vat_rate?: number;
  gra_next_filing_date?: string;
  hefra_license_no?: string;
  hefra_expiry_date?: string;
  encryption_at_rest?: string;
  encryption_in_transit?: string;
  iso27001_status?: string;
};

/**
 * Settings → Compliance tab (Gap Analysis Part P, P-D6). Attestations live in
 * platform_settings.compliance jsonb; edits are gated server-side by
 * settings.billing (super_admin only in ROLE_DEFAULTS) — non-holders get a
 * read-only view.
 */
export default function ComplianceTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [form, setForm] = useState<Compliance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/compliance", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load compliance data.");
      setForm(json.compliance ?? {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load compliance data.");
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
      const res = await fetch("/api/settings/compliance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setCanEdit(false);
        throw new Error("Only super admins can edit compliance attestations.");
      }
      if (!res.ok) throw new Error(json.error || "Failed to save compliance data.");
      setForm(json.compliance);
      toast.success("Compliance data saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save compliance data.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400 dark:border-slate-700">
        Loading compliance data...
      </div>
    );
  }

  if (!form) return null;

  const set =
    (key: keyof Compliance) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => (current ? { ...current, [key]: event.target.value } : current));

  const disabled = !canEdit;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={save} disabled={saving || disabled}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            GH-DPA 2012 (Data Protection)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LabeledInput label="Controller registration no." value={form.gh_dpa_registration_no ?? ""} onChange={set("gh_dpa_registration_no")} disabled={disabled} />
          <LabeledInput label="Data Protection Officer" value={form.gh_dpa_dpo_name ?? ""} onChange={set("gh_dpa_dpo_name")} disabled={disabled} />
          <LabeledInput label="DPO email" value={form.gh_dpa_dpo_email ?? ""} onChange={set("gh_dpa_dpo_email")} disabled={disabled} />
          <div className="md:col-span-2">
            <LabeledTextarea label="Retention policy" value={form.gh_dpa_retention_policy ?? ""} onChange={set("gh_dpa_retention_policy")} disabled={disabled} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            GRA Tax
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <LabeledInput label="TIN" value={form.gra_tin ?? ""} onChange={set("gra_tin")} disabled={disabled} />
          <LabeledInput label="VAT rate (%)" value={String(form.gra_vat_rate ?? "17.5")} onChange={set("gra_vat_rate")} disabled={disabled} />
          <LabeledInput label="Next filing date" value={form.gra_next_filing_date ?? ""} onChange={set("gra_next_filing_date")} disabled={disabled} placeholder="2026-09-30" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Health Sector & Security Posture
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LabeledInput label="HEFRA licence no." value={form.hefra_license_no ?? ""} onChange={set("hefra_license_no")} disabled={disabled} />
          <LabeledInput label="HEFRA expiry date" value={form.hefra_expiry_date ?? ""} onChange={set("hefra_expiry_date")} disabled={disabled} placeholder="2027-01-31" />
          <LabeledInput label="Encryption at rest" value={form.encryption_at_rest ?? "AES-256-GCM"} onChange={set("encryption_at_rest")} disabled={disabled} />
          <LabeledInput label="Encryption in transit" value={form.encryption_in_transit ?? "TLS 1.3"} onChange={set("encryption_in_transit")} disabled={disabled} />
          <LabeledInput label="ISO 27001 status" value={form.iso27001_status ?? ""} onChange={set("iso27001_status")} disabled={disabled} placeholder="In preparation" />
        </CardContent>
      </Card>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <Input value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <Textarea rows={3} value={value} onChange={onChange} disabled={disabled} />
    </label>
  );
}
