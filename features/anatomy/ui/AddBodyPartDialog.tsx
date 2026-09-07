"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateBodyPart } from "@/features/anatomy/data/useAnatomy";

// The canonical list lives in schema/ so api/ can import it too.
export { BODY_SYSTEMS } from "@/features/anatomy/schema/body-systems";
import { BODY_SYSTEMS } from "@/features/anatomy/schema/body-systems";

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-2xs font-black uppercase tracking-widest text-slate-500 mb-1 block";


export default function AddBodyPartDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [bodySystem, setBodySystem] = useState("general");
  const [genderScope, setGenderScope] = useState("unspecified");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const createBodyPart = useCreateBodyPart();

  useEffect(() => {
    if (open) {
      setName("");
      setBodySystem("general");
      setGenderScope("unspecified");
      setIcon("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (name.trim().length < 2) return;
    createBodyPart.mutate(
      {
        name: name.trim(),
        body_system: bodySystem,
        gender_scope: genderScope,
        icon: icon.trim() || undefined,
        description: description.trim() || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>➕ Add Body Part</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className={labelCls}>Name *</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Left Ventricle"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Body System</label>
              <select
                className={inputCls}
                value={bodySystem}
                onChange={(e) => setBodySystem(e.target.value)}
              >
                {BODY_SYSTEMS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender Scope</label>
              <select
                className={inputCls}
                value={genderScope}
                onChange={(e) => setGenderScope(e.target.value)}
              >
                <option value="unspecified">Unspecified</option>
                <option value="shared">Shared</option>
                <option value="female">Female only</option>
                <option value="male">Male only</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Icon (emoji)</label>
            <input
              className={inputCls}
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🫀"
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm disabled:opacity-50"
            disabled={createBodyPart.isPending || name.trim().length < 2}
            onClick={handleSubmit}
          >
            {createBodyPart.isPending ? "Saving…" : "Add Body Part"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
