"use client";

/**
 * Assign-to-Collector dialog — mirrors mockup `m-scout-assign` (Part N):
 * collector picker with active-task counts + unassign, SLA priority
 * (Normal 5-day / High 3-day / Urgent 24-hour) and admin notes.
 */

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAssignScoutSubmission } from "@/features/facility-scout/data/useFacilityScout";

type Collector = {
  id: string;
  employee_id: string | null;
  region: string[] | null;
  pending_submissions: number | null;
  is_active: boolean | null;
  user_profiles: { first_name: string | null; last_name: string | null } | null;
};

export function AssignScoutDialog({
  open,
  onOpenChange,
  submissionIds,
  submissionLabel,
  collectors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionIds: string[];
  submissionLabel?: string;
  collectors: Collector[];
}) {
  const [collectorId, setCollectorId] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [notes, setNotes] = useState("");
  const assign = useAssignScoutSubmission();

  useEffect(() => {
    if (!open) {
      setCollectorId("");
      setPriority("normal");
      setNotes("");
    }
  }, [open]);

  const submit = (unassign = false) => {
    if (!unassign && !collectorId) return;
    assign.mutate(
      {
        ids: submissionIds,
        collector_id: unassign ? null : collectorId,
        priority,
        admin_notes: notes || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const activeCollectors = collectors.filter((collector) => collector.is_active !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            🔎 Assign Submission{submissionIds.length > 1 ? "s" : ""}
            {submissionLabel ? ` — ${submissionLabel}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Assign to collector</Label>
            <select
              className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              value={collectorId}
              onChange={(event) => setCollectorId(event.target.value)}
            >
              <option value="">Select collector...</option>
              {activeCollectors.map((collector) => {
                const name =
                  [collector.user_profiles?.first_name, collector.user_profiles?.last_name]
                    .filter(Boolean)
                    .join(" ") || collector.employee_id || "Collector";
                return (
                  <option key={collector.id} value={collector.id}>
                    {name} ({collector.employee_id ?? "—"}) — {collector.pending_submissions ?? 0} active
                  </option>
                );
              })}
              {activeCollectors.length === 0 && (
                <option value="" disabled>No active collectors</option>
              )}
            </select>
          </div>

          <div className="grid gap-2">
            <Label>Priority (SLA)</Label>
            <select
              className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              value={priority}
              onChange={(event) => setPriority(event.target.value as typeof priority)}
            >
              <option value="normal">Normal — 5-day SLA</option>
              <option value="high">High — 3-day SLA</option>
              <option value="urgent">Urgent — 24-hour SLA</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assign-notes">Admin notes</Label>
            <Textarea id="assign-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => submit(true)} disabled={assign.isPending}>
            Unassign
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => submit(false)} disabled={assign.isPending || !collectorId}>
            {assign.isPending ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
