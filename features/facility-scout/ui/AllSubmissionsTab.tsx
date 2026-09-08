"use client";

/**
 * All Submissions tab — app-user scout submissions with match/status
 * badges, masked submitters (K5) and per-status actions (Assign /
 * Reject / Register). Part N Phase 4.
 */

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  useRegisterScoutSubmission,
  type ScoutSubmission,
} from "@/features/facility-scout/data/useFacilityScout";
import { AssignScoutDialog } from "./assign-dialog";
import type { FacilityScoutTabProps } from "@/features/facility-scout/schema/types";

const STATUS_BADGE: Record<string, string> = {
  pending: "amber",
  field_review: "blue",
  registered: "emerald",
  rewarded: "emerald",
  rejected: "destructive",
};

export default function AllSubmissionsTab({ data, loading }: FacilityScoutTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [assignTarget, setAssignTarget] = useState<ScoutSubmission | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ScoutSubmission | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [rejectDuplicate, setRejectDuplicate] = useState(false);
  const reject = useRejectScoutSubmission();
  const register = useRegisterScoutSubmission();

  const submissions = data?.scout_submissions ?? [];
  const collectors = data?.collectors ?? [];

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return submissions.filter((submission) => {
      if (statusFilter !== "all" && submission.status !== statusFilter) return false;
      if (typeFilter !== "all" && submission.facility_type !== typeFilter) return false;
      if (!needle) return true;
      return (
        submission.submission_ref.toLowerCase().includes(needle) ||
        submission.facility_name.toLowerCase().includes(needle) ||
        (submission.region ?? "").toLowerCase().includes(needle)
      );
    });
  }, [submissions, search, statusFilter, typeFilter]);

  const submitReject = () => {
    if (!rejectTarget) return;
    reject.mutate(
      {
        id: rejectTarget.id,
        review_notes: rejectNotes || undefined,
        duplicate: rejectDuplicate,
      },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectNotes("");
          setRejectDuplicate(false);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="flex-1 min-w-[220px] max-w-sm"
          placeholder="🔍 Search ref / facility / region..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold uppercase tracking-widest"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="field_review">In Field Review</option>
          <option value="registered">Registered</option>
          <option value="rewarded">Rewarded</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-bold uppercase tracking-widest"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">All types</option>
          <option value="hospital">Hospital</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="clinic">Clinic</option>
          <option value="lab">Lab</option>
          <option value="chps">CHPS</option>
        </select>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sub ID</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Facility Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GPS</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">
                    Loading submissions...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-sm text-slate-500">
                    No FacilityScout submissions yet — they arrive from the mobile app.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                rows.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-mono font-bold">{submission.submission_ref}</TableCell>
                    <TableCell>
                      <div className="font-bold text-xs">
                        {submission.user_profiles?.masked_name ?? "Unknown user"}
                      </div>
                      <div className="text-2xs text-slate-400 font-mono">
                        {submission.user_profiles?.user_id?.slice(0, 8) ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold">{submission.facility_name}</div>
                      {submission.sla_due_at && new Date(submission.sla_due_at) < new Date() && (
                        <Badge variant="destructive" className="mt-1">SLA overdue</Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">{submission.facility_type}</TableCell>
                    <TableCell className="font-mono text-xs">{submission.gps_location ?? "—"}</TableCell>
                    <TableCell>{(submission.photos ?? []).length}</TableCell>
                    <TableCell>{submission.region ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={submission.match_status === "duplicate" ? "secondary" : "emerald"}>
                        {submission.match_status === "duplicate"
                          ? `🔃 ${submission.matched_facility?.facility_name ?? "Duplicate"}`
                          : "🆕 New"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(STATUS_BADGE[submission.status] ?? "secondary") as any} className="capitalize">
                        {String(submission.status).replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {["pending", "field_review"].includes(submission.status) && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setAssignTarget(submission)}>
                            Assign
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600 dark:text-red-400" onClick={() => setRejectTarget(submission)}>
                            Reject
                          </Button>
                        </>
                      )}
                      {submission.status === "field_review" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-emerald-700 dark:text-emerald-400 border-emerald-200"
                          disabled={register.isPending}
                          onClick={() => register.mutate({ id: submission.id })}
                        >
                          Register
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AssignScoutDialog
        open={Boolean(assignTarget)}
        onOpenChange={(open) => !open && setAssignTarget(null)}
        submissionIds={assignTarget ? [assignTarget.id] : []}
        submissionLabel={assignTarget?.submission_ref}
        collectors={collectors}
      />

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectTarget?.submission_ref}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="reject-notes">Review notes</Label>
              <Textarea id="reject-notes" rows={3} value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} placeholder="Why is this submission rejected?" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={rejectDuplicate} onCheckedChange={(checked) => setRejectDuplicate(Boolean(checked))} />
              Mark as duplicate of an existing facility
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={reject.isPending}>
              {reject.isPending ? "Rejecting..." : "Reject Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
