"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Campaign {
  id: string;
  title: string;
  body: string;
  type: string;
  segment_filter: Record<string, unknown> | null;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  delivery_stats: Record<string, number> | null;
  created_at: string;
  approval_status: "draft" | "pending_approval" | "approved" | "rejected";
  submitted_for_approval_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

interface ReceiptSummary {
  total: number;
  bySendStatus: Record<string, number>;
  byReceiptStatus: Record<string, number>;
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ViewNotificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [receiptSummary, setReceiptSummary] = useState<ReceiptSummary | null>(null);
  const [segmentPreview, setSegmentPreview] = useState<{ targetable: number; with_push_token: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load campaign.");
      }
      const json = await res.json();
      setCampaign(json.campaign);
      setReceiptSummary(json.receiptSummary);
      setSegmentPreview(json.segmentPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!id) return;
    setActing(true);
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Action failed.");
      toast.success("Done");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  if (!id) {
    return <div className="text-center text-slate-400 py-20">No campaign selected.</div>;
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {loading && !campaign && <div className="text-center text-slate-400 py-20">Loading…</div>}

      {campaign && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-xl">{campaign.title}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">{campaign.body}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${STATUS_COLOR[campaign.approval_status]}`}>
                {STATUS_LABEL[campaign.approval_status]}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Label className="text-slate-400">Type</Label>
                <div className="capitalize font-bold">{campaign.type}</div>
                <Label className="text-slate-400">Scheduled</Label>
                <div>{formatDate(campaign.scheduled_at)}</div>
                <Label className="text-slate-400">Sent</Label>
                <div>{campaign.sent_at ? formatDate(campaign.sent_at) : "Not sent yet"}</div>
                {campaign.failed_at && (
                  <>
                    <Label className="text-slate-400">Failed</Label>
                    <div className="text-red-600">{formatDate(campaign.failed_at)} — {campaign.failure_reason}</div>
                  </>
                )}
                {campaign.rejection_reason && (
                  <>
                    <Label className="text-slate-400">Rejection Reason</Label>
                    <div className="text-red-600">{campaign.rejection_reason}</div>
                  </>
                )}
                <Label className="text-slate-400">Submitted</Label>
                <div>{formatDate(campaign.submitted_for_approval_at)}</div>
                <Label className="text-slate-400">Approved</Label>
                <div>{formatDate(campaign.approved_at)}</div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Segment Reach</div>
                <div className="text-sm font-bold">
                  {segmentPreview?.targetable ?? 0} users targetable, {segmentPreview?.with_push_token ?? 0} with a push token
                </div>
              </div>

              {receiptSummary && receiptSummary.total > 0 && (
                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Send Status</div>
                    {Object.entries(receiptSummary.bySendStatus).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs py-0.5"><span className="capitalize">{k.replaceAll("_", " ")}</span><b>{v}</b></div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Receipt Status</div>
                    {Object.entries(receiptSummary.byReceiptStatus).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs py-0.5"><span className="capitalize">{k.replaceAll("_", " ")}</span><b>{v}</b></div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                {campaign.approval_status === "draft" && !campaign.sent_at && (
                  <Button size="sm" disabled={acting} onClick={() => runAction("submit")}>Submit for Approval</Button>
                )}
                {campaign.approval_status === "pending_approval" && (
                  <>
                    <Button size="sm" disabled={acting} onClick={() => runAction("approve")}>Approve</Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={acting}
                      onClick={() => runAction("reject", { rejectionReason: window.prompt("Reason for rejection?") || undefined })}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {campaign.approval_status === "rejected" && (
                  <Button size="sm" disabled={acting} onClick={() => runAction("revise")}>Move Back to Draft</Button>
                )}
                {campaign.approval_status === "approved" && !campaign.sent_at && (
                  <Button size="sm" disabled={acting} onClick={() => runAction("send")}>Send Now</Button>
                )}
                {!campaign.sent_at && campaign.approval_status !== "draft" && (
                  <Button size="sm" variant="outline" disabled={acting} onClick={() => runAction("cancel")}>Cancel</Button>
                )}
              </div>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
