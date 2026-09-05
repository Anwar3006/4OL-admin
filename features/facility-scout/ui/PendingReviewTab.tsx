"use client";

/**
 * Pending Review tab — queue of pending/field_review submissions with
 * checkbox selection, Assign dialog and Bulk Assign / Reject Selected.
 * Part N Phase 4.
 */

import React, { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useRejectScoutSubmission,
  type ScoutSubmission,
} from "@/features/facility-scout/data/useFacilityScout";
import { AssignScoutDialog } from "./assign-dialog";
import type { FacilityScoutTabProps } from "@/features/facility-scout/schema/types";

export default function PendingReviewTab({ data, loading }: FacilityScoutTabProps) {
  const [regionFilter, setRegionFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [singleTarget, setSingleTarget] = useState<ScoutSubmission | null>(null);
  const reject = useRejectScoutSubmission();

  const submissions = data?.scout_submissions ?? [];
  const collectors = data?.collectors ?? [];

  const rows = useMemo(
    () =>
      submissions.filter(
        (submission) =>
          ["pending", "field_review"].includes(submission.status) &&
          (!regionFilter ||
            (submission.region ?? "").toLowerCase() === regionFilter.toLowerCase()),
      ),
    [submissions, regionFilter],
  );

  const regions = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.region).filter(Boolean))) as string[],
    [submissions],
  );

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    setSelected(selected.length === rows.length ? [] : rows.map((row) => row.id));
  };

  const rejectSelected = () => {
    if (selected.length === 0) return;
    reject.mutate(
      { ids: selected, review_notes: "Bulk rejection from Pending Review" },
      { onSuccess: () => setSelected([]) },
    );
  };

  const collectorName = (id: string | null) => {
    if (!id) return "—";
    const collector = collectors.find((item: any) => item.id === id);
    if (!collector) return "—";
    return (
      [collector.user_profiles?.first_name, collector.user_profiles?.last_name]
        .filter(Boolean)
        .join(" ") || collector.employee_id
    );
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Assign submissions to field collectors for on-ground verification. SLA windows:
          Normal 5 days · High 3 days · Urgent 24 hours.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-bold uppercase tracking-widest"
          value={regionFilter}
          onChange={(event) => setRegionFilter(event.target.value)}
        >
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
        <div className="flex-1" />
        <Button
          variant="outline"
          disabled={selected.length === 0}
          onClick={() => setAssignOpen(true)}
        >
          Bulk Assign ({selected.length})
        </Button>
        <Button
          variant="outline"
          className="text-red-600 border-red-200"
          disabled={selected.length === 0 || reject.isPending}
          onClick={rejectSelected}
        >
          Reject Selected
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={rows.length > 0 && selected.length === rows.length}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Sub ID</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-sm text-slate-500">
                    Loading pending queue...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-sm text-slate-500">
                    Queue clear — no submissions waiting for review.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(submission.id)}
                        onCheckedChange={() => toggle(submission.id)}
                        aria-label={`Select ${submission.submission_ref}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-bold">{submission.submission_ref}</TableCell>
                    <TableCell>
                      <div className="font-bold">{submission.facility_name}</div>
                      <div className="text-xs text-slate-500">
                        by {submission.user_profiles?.masked_name ?? "Unknown"} · {(submission.photos ?? []).length} photos
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{submission.facility_type}</TableCell>
                    <TableCell>{submission.region ?? "—"}</TableCell>
                    <TableCell>{collectorName(submission.assigned_collector_id)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={submission.priority === "urgent" ? "destructive" : submission.priority === "high" ? "amber" : "secondary"}
                        className="capitalize"
                      >
                        {submission.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(submission.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSingleTarget(submission)}>
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssignScoutDialog
        open={assignOpen || Boolean(singleTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignOpen(false);
            setSingleTarget(null);
            setSelected([]);
          }
        }}
        submissionIds={singleTarget ? [singleTarget.id] : selected}
        submissionLabel={singleTarget?.submission_ref ?? `${selected.length} selected`}
        collectors={collectors}
      />
    </div>
  );
}
