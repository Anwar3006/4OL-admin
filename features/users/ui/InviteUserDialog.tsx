"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInviteUser } from "@/features/users/data/useAdminUsers";

const GH_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Central",
  "Eastern",
  "Volta",
  "Northern",
  "Upper East",
  "Upper West",
  "Brong Ahafo",
  "Bono",
  "Bono East",
  "Ahafo",
  "Savannah",
  "North East",
  "Oti",
  "Western North",
];

const inputClass =
  "w-full h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all";
const labelClass =
  "text-2xs font-black uppercase tracking-widest text-slate-500 mb-1 block";

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Creates a user_invites row (role: "user") and surfaces the magic link —
// mirrors the admin invite flow in actions/authenticate.actions.ts.
export default function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const invite = useInviteUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("free");
  const [region, setRegion] = useState("");
  const [note, setNote] = useState("");

  const canSubmit = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && !invite.isPending;

  const submit = () => {
    invite.mutate(
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        plan: plan || undefined,
        region: region || undefined,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName("");
          setEmail("");
          setPhone("");
          setPlan("free");
          setRegion("");
          setNote("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>➕ Invite New User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              className={inputClass}
              placeholder="e.g. Ama Mensah"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input
              className={inputClass}
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                className={inputClass}
                placeholder="+233 …"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Default Plan</label>
              <select
                className={inputClass}
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option value="free">Free</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Region</label>
            <select
              className={inputClass}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">Select region…</option>
              {GH_REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Internal Note</label>
            <textarea
              className={`${inputClass} h-16 py-2 resize-none`}
              placeholder="Why is this user being invited? (stored in audit log)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary text-white"
              disabled={!canSubmit}
              onClick={submit}
            >
              {invite.isPending ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
