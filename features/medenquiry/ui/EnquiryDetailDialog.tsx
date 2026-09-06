"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  StatusBadge,
  TypeBadge,
  formatEnqId,
  formatMoney,
  formatSubmittedAt,
} from "./medEnquiryColumns";
import type { MedEnquiryRow } from "@/features/medenquiry/data/useMedEnquiry";
import { useViewFacilityDialog } from "@/stores/dialog-store";

/**
 * Read-only detail sheet for a medication enquiry — Part AB.
 * Shows medication, submitter (masked server-side), fulfilment, escrow and
 * every pharmacy response with its price. Pharmacy names open the shared
 * Facilities profile dialog (Facilities ↔ Medication Enquiry linkage).
 */
export default function EnquiryDetailDialog({
  enquiry,
  onClose,
}: {
  enquiry: MedEnquiryRow | null;
  onClose: () => void;
}) {
  const viewFacility = useViewFacilityDialog();
  return (
    <Dialog open={Boolean(enquiry)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm font-black uppercase tracking-widest">
              {enquiry ? formatEnqId(enquiry.id) : ""}
            </DialogTitle>
            {enquiry && <StatusBadge status={enquiry.status} />}
          </div>
        </DialogHeader>
        {enquiry && (
          <div className="space-y-3">
            <div className="space-y-2 text-xs font-bold">
              {[
                ["Medication", enquiry.medication_name],
                ["Dosage / Qty", [enquiry.dosage ?? "—", enquiry.quantity ? `${enquiry.quantity} ${enquiry.unit ?? ""}` : ""].filter(Boolean).join(" · ") || "—"],
                ["Type", ""],
                ["Submitted By", `${enquiry.submitter_name}${enquiry.submitter_region ? ` (${enquiry.submitter_region})` : ""}`],
                ["Prescription", enquiry.prescription_url ? "Attached" : "None"],
                ["Fulfilment", enquiry.fulfilment_mode === "delivery" ? "Delivery" : "Pickup"],
                ...(enquiry.fulfilment_mode === "delivery" && enquiry.delivery_address
                  ? [["Delivery Address", enquiry.delivery_address] as const]
                  : []),
                ...(enquiry.courier_name ? [["Courier", enquiry.courier_name] as const] : []),
                ...(enquiry.tracking_number ? [["Tracking #", enquiry.tracking_number] as const] : []),
                ...(enquiry.pickup_confirmation_code
                  ? [["Pickup Code", enquiry.pickup_confirmation_code] as const]
                  : []),
                ...(enquiry.escrow_amount !== null
                  ? [["Escrow Held", formatMoney(enquiry.escrow_amount)] as const]
                  : []),
                ...(enquiry.payment_amount !== null
                  ? [["Payment Amount", formatMoney(enquiry.payment_amount)] as const]
                  : []),
                ["Submitted", formatSubmittedAt(enquiry.created_at)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-400 font-medium">{label}</span>
                  <span className="text-slate-800 uppercase tracking-tight text-right">
                    {label === "Type" ? <TypeBadge type={enquiry.enquiry_type} /> : value}
                  </span>
                </div>
              ))}
            </div>

            {enquiry.medication_description && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Description
                </div>
                <p className="text-[11px] font-medium text-slate-600">{enquiry.medication_description}</p>
              </div>
            )}

            {enquiry.pharmacy && (
              <button
                onClick={() => viewFacility.open(enquiry.pharmacy!.id)}
                className="w-full flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-left hover:bg-emerald-100 transition-all"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">
                    🏥 Matched Pharmacy
                  </div>
                  <div className="text-[11px] font-black text-emerald-800">
                    {enquiry.pharmacy.facility_name ?? "Unknown pharmacy"}
                  </div>
                  {(enquiry.pharmacy.area || enquiry.pharmacy.region) && (
                    <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">
                      {[enquiry.pharmacy.area, enquiry.pharmacy.region].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                  View Profile →
                </span>
              </button>
            )}

            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Pharmacy Responses ({enquiry.responses?.length ?? enquiry.response_count})
              </div>
              {enquiry.responses && enquiry.responses.length > 0 ? (
                <div className="space-y-1.5">
                  {enquiry.responses.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 ${
                        r.facility?.id ? "hover:bg-slate-50 transition-all" : ""
                      }`}
                      onClick={r.facility?.id ? () => viewFacility.open(r.facility!.id) : undefined}
                      role={r.facility?.id ? "button" : undefined}
                    >
                      <div>
                        <div className="text-[11px] font-black text-slate-700">
                          {r.facility?.facility_name ?? (r.responder_kind === "wholesaler" ? "Wholesaler" : "Pharmacy")}
                          {r.facility?.id && <span className="ml-1 text-[9px] text-emerald-500">🏥</span>}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          {r.status} · {r.available ? "Available" : "Unavailable"}
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-emerald-600">
                        {r.price !== null ? formatMoney(r.price) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Awaiting pharmacy responses
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
