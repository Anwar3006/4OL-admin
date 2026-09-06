"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRegisterIbp } from "@/features/ibp/data/useIBP";
import {
  isRestrictedIbpType,
  RESTRICTED_IBP_TYPES,
  RESTRICTED_TYPE_WARNING,
} from "@/features/ibp/schema/constants";

const BUSINESS_CATEGORIES = [
  "Optical Store",
  "Physiotherapy",
  "Nutrition/Dietetics",
  "Maternity & Childcare",
  "Medical Equipment",
  "Telemedicine",
  "Health Insurance Broker",
  "Ambulance Service",
  "Mortuary/Funeral Service",
  "Veterinary Clinic",
  "Other",
  ...RESTRICTED_IBP_TYPES,
];

const inputClass =
  "w-full h-10 px-4 rounded-xl border border-slate-200 text-[12px] font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all";
const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

interface RegisterIbpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RegisterIbpDialog({ open, onOpenChange }: RegisterIbpDialogProps) {
  const register = useRegisterIbp();
  const [form, setForm] = useState({
    business_name: "",
    business_category: "",
    specific_category: "",
    owner_name: "",
    phone_number: "",
    whatsapp_number: "",
    website: "",
    region: "",
    city: "",
    branches: "1",
    founded_year: "",
    tin_number: "",
    rgd_number: "",
    plan: "free",
    skip_verification: false,
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const restricted = isRestrictedIbpType(form.business_category);
  const canSubmit =
    form.business_name.trim().length >= 2 &&
    form.business_category.trim().length >= 2 &&
    !restricted &&
    !register.isPending;

  const submit = () => {
    register.mutate(
      {
        ...form,
        branches: Number(form.branches || 1),
        founded_year: form.founded_year ? Number(form.founded_year) : undefined,
        skip_verification: form.skip_verification,
      },
      {
        onSuccess: () => {
          setForm({
            business_name: "",
            business_category: "",
            specific_category: "",
            owner_name: "",
            phone_number: "",
            whatsapp_number: "",
            website: "",
            region: "",
            city: "",
            branches: "1",
            founded_year: "",
            tin_number: "",
            rgd_number: "",
            plan: "free",
            skip_verification: false,
          });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ Register IBP Business</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="sm:col-span-2">
            <label className={labelClass}>Business Name *</label>
            <input
              className={inputClass}
              value={form.business_name}
              onChange={(e) => set("business_name", e.target.value)}
              placeholder="e.g. ClearView Opticians"
            />
          </div>

          <div>
            <label className={labelClass}>Business Category *</label>
            <select
              className={inputClass}
              value={form.business_category}
              onChange={(e) => set("business_category", e.target.value)}
            >
              <option value="">Select category…</option>
              {BUSINESS_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Specific Category</label>
            <input
              className={inputClass}
              value={form.specific_category}
              onChange={(e) => set("specific_category", e.target.value)}
              placeholder="e.g. Contact lens fitting"
            />
          </div>

          {restricted && (
            <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700 leading-relaxed">
              ⛔ {RESTRICTED_TYPE_WARNING} Use the Facilities module instead.
            </div>
          )}

          <div>
            <label className={labelClass}>Owner Name</label>
            <input
              className={inputClass}
              value={form.owner_name}
              onChange={(e) => set("owner_name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              className={inputClass}
              value={form.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              placeholder="+233 …"
            />
          </div>
          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              className={inputClass}
              value={form.whatsapp_number}
              onChange={(e) => set("whatsapp_number", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input
              className={inputClass}
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Region</label>
            <input
              className={inputClass}
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              className={inputClass}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Branches</label>
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.branches}
              onChange={(e) => set("branches", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Founded Year</label>
            <input
              className={inputClass}
              type="number"
              value={form.founded_year}
              onChange={(e) => set("founded_year", e.target.value)}
              placeholder="e.g. 2015"
            />
          </div>
          <div>
            <label className={labelClass}>TIN Number</label>
            <input
              className={inputClass}
              value={form.tin_number}
              onChange={(e) => set("tin_number", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>RGD Number (Registrar General)</label>
            <input
              className={inputClass}
              value={form.rgd_number}
              onChange={(e) => set("rgd_number", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Plan</label>
            <select
              className={inputClass}
              value={form.plan}
              onChange={(e) => set("plan", e.target.value)}
            >
              <option value="free">Free</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="featured">Featured</option>
            </select>
          </div>

          <label className="sm:col-span-2 flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={form.skip_verification}
              onChange={(e) => set("skip_verification", e.target.checked)}
            />
            Skip verification — publish immediately (documents verified offline)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
          <button className="btn btn-secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary text-white"
            disabled={!canSubmit}
            onClick={submit}
          >
            {register.isPending ? "Registering…" : "Register Business"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
