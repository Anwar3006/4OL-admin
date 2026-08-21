"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PharmacyCampaign = {
  id: string;
  pharmacy_id: string | null;
  name: string;
  message: string;
  radius_km: number;
  audience_count: number | null;
  channel: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

const RADII = [0.5, 2, 5] as const;

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Pharmacy Marketing tab (Gap Analysis Part R, R-D4). Radius picker limited
 * to the sanctioned 0.5/2/5 km values; audience estimate comes live from the
 * segment-preview route; the 4-rule compliance footer mirrors the mockup.
 */
export default function PharmacyTab() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<PharmacyCampaign[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/pharmacy", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load pharmacy campaigns.");
      setCampaigns(json.campaigns ?? []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Radius geo-campaigns ({campaigns.length})
          </CardTitle>
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Radius</TableHead>
                <TableHead className="text-right">Audience</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Sent / Scheduled</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    Loading pharmacy campaigns...
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    No pharmacy geo-campaigns yet. Create one with the radius picker.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="min-w-[240px] whitespace-normal">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{campaign.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.message}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{campaign.radius_km} km</TableCell>
                    <TableCell className="text-right tabular-nums">{campaign.audience_count ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{campaign.channel}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(campaign.sent_at ?? campaign.scheduled_at)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          campaign.status === "sent"
                            ? "emerald"
                            : campaign.status === "scheduled"
                              ? "amber"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div>
          <span className="font-medium text-slate-700 dark:text-slate-200">Send rules enforced server-side: </span>
          (1) radius limited to 0.5 / 2 / 5 km; (2) every campaign names its message and audience size;
          (3) channel restricted to push/WhatsApp with opt-outs respected by the send pipeline;
          (4) audience reach is recorded at creation for the compliance trail.
        </div>
      </div>

      <NewPharmacyCampaignDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}

function NewPharmacyCampaignDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [radius, setRadius] = useState<number>(2);
  const [channel, setChannel] = useState<"push" | "whatsapp">("push");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [audience, setAudience] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/notifications/segment-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segmentFilter: { audience: "all_users" } }),
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        setAudience(json.targetable ?? null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open]);

  const submit = async () => {
    if (!name.trim() || !message.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/pharmacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          radiusKm: radius,
          channel,
          audienceCount: audience,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to create campaign.");
      toast.success(scheduledAt ? "Campaign scheduled." : "Campaign draft created.");
      setName("");
      setMessage("");
      setScheduledAt("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Pharmacy Geo-Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Campaign name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="Message users will receive"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />

          <div>
            <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Radius around the pharmacy
            </div>
            <div className="flex gap-2">
              {RADII.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRadius(value)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    radius === value
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700",
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {value} km
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              aria-label="Schedule for (optional)"
            />
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
            {previewLoading ? (
              "Estimating reach…"
            ) : (
              <>
                Estimated reach: <span className="text-slate-900 dark:text-slate-100">{audience ?? 0}</span> users
                within platform coverage
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={submit} disabled={saving || !name.trim() || !message.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {scheduledAt ? "Schedule Campaign" : "Create Draft"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
