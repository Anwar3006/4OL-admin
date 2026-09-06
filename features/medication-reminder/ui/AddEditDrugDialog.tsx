"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DRUG_AVAILABILITY,
  DRUG_CATEGORIES,
  DRUG_STATUSES,
} from "@/lib/shared-constants";
import { useCreateDrug, useUpdateDrug, type DrugRow } from "@/features/medication-reminder/data/useDrugs";

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

interface FormState {
  name: string;
  generic_name: string;
  category: string;
  availability: string;
  dosage_form: string;
  strength: string;
  strength_unit: string;
  pack_size: string;
  manufacturer: string;
  active_ingredients: string;
  conditions_treated: string;
  atc_code: string;
  status: string;
}

const EMPTY: FormState = {
  name: "",
  generic_name: "",
  category: "",
  availability: "unknown",
  dosage_form: "",
  strength: "",
  strength_unit: "",
  pack_size: "",
  manufacturer: "",
  active_ingredients: "",
  conditions_treated: "",
  atc_code: "",
  status: "active",
};

export default function AddEditDrugDialog({
  open,
  onOpenChange,
  drug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drug?: DrugRow | null;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const createDrug = useCreateDrug();
  const updateDrug = useUpdateDrug();
  const isEdit = Boolean(drug);

  useEffect(() => {
    if (open) {
      setForm(
        drug
          ? {
              name: drug.name || "",
              generic_name: drug.generic_name || "",
              category: drug.category || "",
              availability: drug.availability || "unknown",
              dosage_form: drug.dosage_form || "",
              strength: drug.strength || "",
              strength_unit: drug.strength_unit || "",
              pack_size: drug.pack_size != null ? String(drug.pack_size) : "",
              manufacturer: drug.manufacturer || "",
              active_ingredients: (drug.active_ingredients || []).join(", "),
              conditions_treated: (drug.conditions_treated || []).join(", "),
              atc_code: drug.atc_code || "",
              status: drug.status || "active",
            }
          : EMPTY,
      );
    }
  }, [open, drug]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const splitList = (value: string) =>
    value.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSubmit = () => {
    if (form.name.trim().length < 2) return;

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      generic_name: form.generic_name.trim() || null,
      category: form.category || null,
      availability: form.availability,
      dosage_form: form.dosage_form.trim() || null,
      strength: form.strength.trim() || null,
      strength_unit: form.strength_unit.trim() || null,
      pack_size: form.pack_size ? Number(form.pack_size) : null,
      manufacturer: form.manufacturer.trim() || null,
      active_ingredients: splitList(form.active_ingredients),
      conditions_treated: splitList(form.conditions_treated),
      atc_code: form.atc_code.trim() || null,
      status: form.status,
    };

    if (isEdit && drug) {
      updateDrug.mutate(
        { id: drug.id, patch: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createDrug.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const busy = createDrug.isPending || updateDrug.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "✏️ Edit Drug" : "➕ Add Drug"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Drug Name *</label>
            <input className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. Paracetamol 500mg" />
          </div>
          <div>
            <label className={labelCls}>Generic Name</label>
            <input className={inputCls} value={form.generic_name} onChange={set("generic_name")} placeholder="e.g. Acetaminophen" />
          </div>
          <div>
            <label className={labelCls}>ATC Code</label>
            <input className={inputCls} value={form.atc_code} onChange={set("atc_code")} placeholder="e.g. N02BE01" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category} onChange={set("category")}>
              <option value="">— Select —</option>
              {DRUG_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Availability</label>
            <select className={inputCls} value={form.availability} onChange={set("availability")}>
              {DRUG_AVAILABILITY.map((a) => (
                <option key={a} value={a}>{a === "rx_only" ? "Rx Only" : a.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Dosage Form</label>
            <input className={inputCls} value={form.dosage_form} onChange={set("dosage_form")} placeholder="tablet / syrup / injection…" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Strength</label>
              <input className={inputCls} value={form.strength} onChange={set("strength")} placeholder="500" />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <input className={inputCls} value={form.strength_unit} onChange={set("strength_unit")} placeholder="mg" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pack Size</label>
            <input className={inputCls} type="number" min={1} value={form.pack_size} onChange={set("pack_size")} placeholder="100" />
          </div>
          <div>
            <label className={labelCls}>Manufacturer</label>
            <input className={inputCls} value={form.manufacturer} onChange={set("manufacturer")} />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={form.status} onChange={set("status")}>
              {DRUG_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Active Ingredients (comma-separated)</label>
            <input className={inputCls} value={form.active_ingredients} onChange={set("active_ingredients")} placeholder="amoxicillin, clavulanic acid" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Conditions Treated (comma-separated)</label>
            <input className={inputCls} value={form.conditions_treated} onChange={set("conditions_treated")} placeholder="hypertension, diabetes" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm disabled:opacity-50"
            disabled={busy || form.name.trim().length < 2}
            onClick={handleSubmit}
          >
            {busy ? "Saving…" : isEdit ? "Save Changes" : "Add Drug"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
