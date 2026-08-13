"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ComplianceSettings {
  gra_tax_id: string | null;
  vat_rate: number | null;
  vat_filing_frequency: string | null;
  next_filing_due_date: string | null;
  last_filed_at: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export default function ComplianceGRA({ loading: dashboardLoading }: { loading: boolean }) {
  const [settings, setSettings] = useState<ComplianceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance/settings", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isConfigured = Boolean(settings?.gra_tax_id);
  const items = [
    { label: "GRA Tax ID", value: settings?.gra_tax_id || "Not configured" },
    { label: "VAT Rate", value: settings?.vat_rate != null ? `${settings.vat_rate}%` : "Not configured" },
    { label: "Filing Frequency", value: settings?.vat_filing_frequency || "Not configured" },
    { label: "Next Filing Due", value: formatDate(settings?.next_filing_due_date ?? null) },
    { label: "Last Filed", value: formatDate(settings?.last_filed_at ?? null) },
  ];

  return (
    <div className="card">
      <div className="card-header border-b border-slate-100 mb-3 flex items-center justify-between">
        <h2 className="card-title text-[13px]">Compliance & GRA</h2>
        <div className="flex items-center gap-2">
          <span className={`badge text-[9px] ${isConfigured ? "badge-green" : "badge-amber"}`}>
            {isConfigured ? "Configured" : "Awaiting data"}
          </span>
          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => setDialogOpen(true)}>
            Configure
          </Button>
        </div>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs font-bold gap-4">
            <span className="text-slate-500">{item.label}</span>
            <span className="text-right text-slate-600 capitalize">
              {dashboardLoading || loading ? "Loading" : item.value}
            </span>
          </div>
        ))}
      </div>
      <ComplianceConfigDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        settings={settings}
        onSaved={load}
      />
    </div>
  );
}

function ComplianceConfigDialog({
  open,
  onClose,
  settings,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  settings: ComplianceSettings | null;
  onSaved: () => void;
}) {
  const [graTaxId, setGraTaxId] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextDue, setNextDue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setGraTaxId(settings?.gra_tax_id ?? "");
      setVatRate(settings?.vat_rate != null ? String(settings.vat_rate) : "");
      setFrequency(settings?.vat_filing_frequency ?? "monthly");
      setNextDue(settings?.next_filing_due_date ?? "");
    }
  }, [open, settings]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/compliance/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graTaxId: graTaxId || null,
          vatRate: vatRate ? Number(vatRate) : null,
          vatFilingFrequency: frequency,
          nextFilingDueDate: nextDue || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save compliance settings.");
      }
      toast.success("Compliance settings updated");
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save compliance settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Compliance & GRA Settings</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="GRA Tax ID" value={graTaxId} onChange={(e) => setGraTaxId(e.target.value)} />
          <Input placeholder="VAT Rate (%)" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annually">Annually</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
