"use client";

import React from "react";
import { CalendarClock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ScheduledCampaign = {
  id: string;
  title: string;
  body: string;
  type: string;
  scheduled_at: string | null;
  sent_at: string | null;
  failed_at: string | null;
  approval_status: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Scheduled tab (Gap Analysis Part R, R-D6) — a filter view over
 * notification_campaigns for rows with a future scheduled_at that haven't
 * been sent yet. Cancel uses the existing campaigns/[id] cancel action.
 */
export default function ScheduledTab({
  campaigns,
  loading,
  onRefresh,
}: {
  campaigns: ScheduledCampaign[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const scheduled = campaigns.filter(
    (campaign) =>
      campaign.scheduled_at && !campaign.sent_at && !campaign.failed_at,
  );

  const cancel = async (id: string, title: string) => {
    if (!window.confirm(`Cancel scheduled send "${title}"? It moves back to draft.`)) return;
    try {
      const res = await fetch(`/api/notifications/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to cancel campaign.");
      toast.success("Scheduled send cancelled.");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel campaign.");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Alert className="rounded-none border-x-0 border-t-0">
          <CalendarClock className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Review scheduled sends before they go out — a cancelled campaign
            returns to draft and keeps its approval state.
          </AlertDescription>
        </Alert>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Scheduled For</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  Loading scheduled sends...
                </TableCell>
              </TableRow>
            ) : scheduled.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No campaigns are scheduled.
                </TableCell>
              </TableRow>
            ) : (
              scheduled.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="min-w-[240px] whitespace-normal">
                    <div className="font-medium text-slate-800 dark:text-slate-100">{campaign.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.body}</div>
                  </TableCell>
                  <TableCell className="capitalize">{campaign.type.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={campaign.approval_status === "approved" ? "emerald" : "amber"} className="capitalize">
                      {campaign.approval_status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(campaign.scheduled_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cancel(campaign.id, campaign.title)}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
