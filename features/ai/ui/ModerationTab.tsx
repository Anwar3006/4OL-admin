"use client";

import React, { useCallback, useState } from "react";
import { Ban, MessageSquareWarning, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  deriveRisk,
  formatDate,
  STATUS_LABEL,
  type ModerationItem,
} from "@/features/ai/schema/types";
import { EmptyRow } from "@/features/ai/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ModerationAction = "dismiss" | "warn" | "remove" | "ban";

const ACTION_LABEL: Record<string, string> = {
  dismiss: "Dismissed",
  warn: "Warned",
  remove: "Removed",
  ban: "Banned",
};

const RISK_BADGE: Record<string, { variant: "destructive" | "amber" | "secondary" }> = {
  high: { variant: "destructive" },
  medium: { variant: "amber" },
  low: { variant: "secondary" },
};

export function ModerationTable({
  loading,
  items,
  onActionComplete,
}: {
  loading: boolean;
  items: ModerationItem[];
  onActionComplete: () => void;
}) {
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const handleAction = useCallback(
    async (id: string, action: ModerationAction) => {
      setActingOnId(id);
      try {
        const res = await fetch("/api/ai/moderation-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to update moderation item.");
        }
        toast.success(
          action === "dismiss"
            ? "Flag dismissed."
            : action === "warn"
              ? "Content warned."
              : action === "remove"
                ? "Content removed."
                : "Author banned.",
        );
        onActionComplete();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setActingOnId(null);
      }
    },
    [onActionComplete],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Moderation Queue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Flagged</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && <EmptyRow colSpan={7} label="Loading moderation queue..." />}
            {!loading && items.length === 0 && (
              <EmptyRow colSpan={7} label="No moderation flags found." />
            )}
            {!loading &&
              items.map((item) => {
                const isPending = item.status === "pending_review";
                const isActing = actingOnId === item.id;
                const risk = deriveRisk(item);
                const confidence = Math.round(Number(item.ai_confidence ?? 0));
                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[220px]">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">
                        {item.content_type.replaceAll("_", " ")}
                      </div>
                      <div className="mt-1 truncate font-mono text-xs text-slate-400">
                        {item.content_id}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-sm whitespace-normal text-xs text-slate-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.report_reason}
                      </span>
                      {item.ai_reason ? ` — ${item.ai_reason}` : ""}
                      {item.report_detail ? ` — ${item.report_detail}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={RISK_BADGE[risk].variant} className="uppercase">
                        {risk}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-[110px]">
                      {item.ai_detected ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                              className={`h-full rounded-full ${
                                risk === "high"
                                  ? "bg-red-500"
                                  : risk === "medium"
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-slate-500">{confidence}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Manual</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isPending ? "amber" : "emerald"}>
                        {STATUS_LABEL[item.status] ?? item.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label="Dismiss"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "dismiss")}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Warn"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 hover:text-amber-600 dark:hover:text-amber-400"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "warn")}
                          >
                            <MessageSquareWarning className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Remove content"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "remove")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            aria-label="Ban author"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-700 dark:hover:text-red-400"
                            disabled={isActing}
                            onClick={() => handleAction(item.id, "ban")}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {item.action_taken
                            ? ACTION_LABEL[item.action_taken] ?? item.action_taken
                            : STATUS_LABEL[item.status] ?? item.status}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
