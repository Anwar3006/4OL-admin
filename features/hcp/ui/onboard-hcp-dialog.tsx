"use client";

/**
 * HCP onboarding dialog — port of m-hcp-onboard (Gap Analysis Part J, J4).
 * Submissions land as 'pending verification' (J-D2/J-D7): license checks
 * against MDC/PCG/NMC/AHPC/GPC portals remain a manual admin step.
 * Links to an existing user account by email (hcp_verifications.user_id is
 * NOT NULL UNIQUE).
 */

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  PROFESSION_TYPES,
  REGULATORY_BODIES,
  useOnboardHcp,
  type HcpOnboardInput,
} from "@/features/hcp/data/useHcpApi";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";

const EMPTY_FORM: HcpOnboardInput = {
  user_email: "",
  license_number: "",
  license_type: "",
  issuing_body: "",
  license_expiry: "",
  specialty: "",
  profession_type: "",
  affiliated_facility_name: "",
  region: "",
  can_respond_enquiries: false,
};

const OnboardHcpDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<HcpOnboardInput>(EMPTY_FORM);
  const onboardHcp = useOnboardHcp();

  useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open]);

  const set = (key: keyof HcpOnboardInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }) as HcpOnboardInput);

  const handleSubmit = async () => {
    if (!form.user_email || !form.license_number || !form.issuing_body) return;
    try {
      await onboardHcp.mutateAsync({
        ...form,
        specialty: form.specialty || undefined,
        profession_type: form.profession_type || undefined,
        affiliated_facility_name: form.affiliated_facility_name || undefined,
        region: form.region || undefined,
      });
      onClose();
    } catch {
      // toast handled by the hook
    }
  };

  const inputClass =
    "w-full h-9 px-3 rounded-xl border border-slate-200 text-[12px] font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none";
  const labelClass =
    "text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden.Root>
          <DialogTitle>Onboard healthcare professional</DialogTitle>
        </VisuallyHidden.Root>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              👩‍⚕️ Onboard Healthcare Professional
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Submits as pending verification — manual licence check required
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-amber-800">
            ⚠️ Manual verification: confirm the licence against the issuing
            body portal (MDC / PCG / NMC / AHPC / GPC) before approving.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className={labelClass}>User Account Email *</label>
              <input
                className={inputClass}
                type="email"
                placeholder="professional@example.com"
                value={form.user_email}
                onChange={(e) => set("user_email", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Profession / Role</label>
              <select
                className={inputClass}
                value={form.profession_type ?? ""}
                onChange={(e) => set("profession_type", e.target.value)}
              >
                <option value="">Select profession...</option>
                {PROFESSION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Specialty</label>
              <input
                className={inputClass}
                placeholder="e.g. Cardiology"
                value={form.specialty ?? ""}
                onChange={(e) => set("specialty", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Regulatory Body *</label>
              <select
                className={inputClass}
                value={form.issuing_body}
                onChange={(e) => set("issuing_body", e.target.value)}
              >
                <option value="">Select body...</option>
                {REGULATORY_BODIES.map((body) => (
                  <option key={body} value={body}>
                    {body}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>License Number *</label>
              <input
                className={inputClass}
                placeholder="MDC/YYYY/NNNN"
                value={form.license_number}
                onChange={(e) => set("license_number", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>License Type</label>
              <input
                className={inputClass}
                placeholder="e.g. Full Practice"
                value={form.license_type}
                onChange={(e) => set("license_type", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>License Expiry *</label>
              <input
                className={inputClass}
                type="date"
                value={form.license_expiry}
                onChange={(e) => set("license_expiry", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Affiliated Facility</label>
              <input
                className={inputClass}
                placeholder="Facility name or Private Practice"
                value={form.affiliated_facility_name ?? ""}
                onChange={(e) => set("affiliated_facility_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Region</label>
              <select
                className={inputClass}
                value={form.region ?? ""}
                onChange={(e) => set("region", e.target.value)}
              >
                <option value="">Select region...</option>
                {GHANA_REGIONS_ENUM.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <input
                id="can-respond-enquiries"
                type="checkbox"
                checked={!!form.can_respond_enquiries}
                onChange={(e) => set("can_respond_enquiries", e.target.checked)}
              />
              <label
                htmlFor="can-respond-enquiries"
                className="text-[11px] font-bold text-slate-700"
              >
                💊 Can respond to Medication Enquiries
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm text-white disabled:opacity-40"
              disabled={
                onboardHcp.isPending ||
                !form.user_email ||
                !form.license_number ||
                !form.license_expiry ||
                !form.issuing_body ||
                !form.license_type
              }
              onClick={handleSubmit}
            >
              {onboardHcp.isPending ? "Submitting..." : "Submit for Verification"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardHcpDialog;
