"use client";

/**
 * Review Facility dialog — port of the mockup m-approve-facility surface
 * (Gap Analysis Part H, H2, H-D7).
 *
 * Scope implemented: SLA days-waiting highlight (display-only, H-D7),
 * collector/submitted-by identity chip, verification documents viewer,
 * HEFRA number, GPS evidence badge, admin audit note (persisted as
 * status_reason on rejection), SA Decision (Approve & Publish /
 * Reject & Return).
 *
 * Deferred pending user sign-off (H-D6): the Anonymous App Review composer
 * — the facility_reviews.is_anonymous column landed in the migration but
 * admin-authored anonymous reviews need a compliance decision first.
 */

import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { toast } from "sonner";
import {
  useApproveFacility,
  useFacilityProfile,
  useRejectFacility,
} from "@/hooks/supabase-calls/useFacilities";
import { useUpdateFacilityStatusApi } from "@/hooks/supabase-calls/useFacilitiesApi";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

const SLA_DAYS = 3;

interface ReviewFacilityDialogProps {
  facilityId: string | null;
  onClose: () => void;
}

const ReviewFacilityDialog = ({
  facilityId,
  onClose,
}: ReviewFacilityDialogProps) => {
  const open = Boolean(facilityId);
  const { data: facility, isLoading } = useFacilityProfile({
    id: facilityId ?? "",
    enabled: open,
  });
  const { data: session } = useSupabaseSession();
  const approveFacility = useApproveFacility();
  const rejectFacility = useRejectFacility();
  const updateStatus = useUpdateFacilityStatusApi();
  const [auditNote, setAuditNote] = useState("");

  const daysWaiting = useMemo(() => {
    if (!facility?.created_at) return null;
    return Math.floor(
      (Date.now() - new Date(facility.created_at).getTime()) /
        (24 * 3600 * 1000),
    );
  }, [facility?.created_at]);

  const documents = useMemo(() => {
    const docs = (facility as any)?.verification_documents;
    if (Array.isArray(docs)) return docs;
    return [];
  }, [facility]);

  const handleApprove = async () => {
    if (!facility) return;
    try {
      await approveFacility.mutateAsync({
        adminId: session?.user?.id || "",
        id: facility.id,
        media_urls: ((facility as any).media_urls as string[]) ?? [],
        featured_image_url: (facility as any).featured_image_url ?? "",
      });
      if (auditNote.trim()) {
        await updateStatus.mutateAsync({
          id: facility.id,
          status: "active",
          reason: auditNote.trim(),
        });
      }
      onClose();
    } catch (error: any) {
      toast.error(`Approval failed: ${error?.message ?? error}`);
    }
  };

  const handleReject = async () => {
    if (!facility) return;
    try {
      await rejectFacility.mutateAsync({
        adminId: session?.user?.id || "",
        id: facility.id,
        media_urls: ((facility as any).media_urls as string[]) ?? [],
        featured_image_url: (facility as any).featured_image_url ?? "",
      });
      if (auditNote.trim()) {
        await updateStatus.mutateAsync({
          id: facility.id,
          status: "rejected",
          reason: auditNote.trim(),
        });
      }
      onClose();
    } catch (error: any) {
      toast.error(`Rejection failed: ${error?.message ?? error}`);
    }
  };

  const busy = approveFacility.isPending || rejectFacility.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden.Root>
          <DialogTitle>Review facility submission</DialogTitle>
        </VisuallyHidden.Root>

        {isLoading || !facility ? (
          <p className="py-12 text-center text-[11px] font-bold text-slate-400">
            Loading submission...
          </p>
        ) : (
          <div className="space-y-5">
            {daysWaiting !== null && (
              <div
                className={`rounded-2xl px-4 py-3 text-[11px] font-bold border ${
                  daysWaiting > SLA_DAYS
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
              >
                ⏱️ Approval SLA: {SLA_DAYS}-day target — this submission has
                waited{" "}
                <span className="font-black">{daysWaiting} day(s)</span>
                {daysWaiting > SLA_DAYS && " — OVERDUE"}
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  {(facility as any).facility_name}
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {(facility as any).facility_type?.replace(/_/g, " ")} ·{" "}
                  {(facility as any).region} · {(facility as any).district}
                </p>
              </div>
              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-3 py-1.5">
                ⏳ Pending Review
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  📋 Registration Evidence
                </p>
                <div className="text-[11px] font-bold text-slate-700 space-y-1">
                  <p>
                    HEFRA No.:{" "}
                    <span className="font-mono">
                      {(facility as any).hefra_registration_number ?? "—"}
                    </span>
                  </p>
                  <p>
                    Owner: {(facility as any).first_name}{" "}
                    {(facility as any).last_name}
                  </p>
                  <p>Contact: {(facility as any).contact_number}</p>
                  <p>NHIS: {(facility as any).accepts_nhis ? "Accepted" : "Not accepted"}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  📍 Location Evidence
                </p>
                <div className="text-[11px] font-bold text-slate-700 space-y-1">
                  <p>GPS: {(facility as any).gps_address ?? "—"}</p>
                  {typeof (facility as any).latitude === "number" && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-1">
                      ✓ GPS-verified coordinates
                    </span>
                  )}
                  <p>
                    Area: {(facility as any).area}, {(facility as any).district}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                📎 Verification Documents ({documents.length})
              </p>
              {documents.length === 0 ? (
                <p className="text-[11px] font-bold text-slate-400">
                  No documents uploaded.
                </p>
              ) : (
                <ul className="space-y-1">
                  {documents.map((doc: any, index: number) => (
                    <li key={index} className="text-[11px] font-bold text-slate-700">
                      📄 {doc?.name ?? doc?.url ?? `Document ${index + 1}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                🛡️ Admin Audit Note
              </p>
              <textarea
                className="w-full h-24 px-4 py-3 rounded-xl border border-slate-200 text-[12px] font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none"
                placeholder="Decision rationale — stored with the status change..."
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
              />
              <p className="text-[9px] font-bold text-slate-400 mt-1">
                🔒 Anonymous app review composer deferred (H-D6) — pending
                compliance sign-off.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                className="btn btn-secondary btn-sm"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleReject}
                disabled={busy}
              >
                🚫 Reject &amp; Return
              </button>
              <button
                className="btn btn-primary btn-sm text-white"
                onClick={handleApprove}
                disabled={busy}
              >
                ✅ Approve &amp; Publish
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewFacilityDialog;
