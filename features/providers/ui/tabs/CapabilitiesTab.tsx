"use client";

import React, { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGrantCapabilityOverride, useProviderCapabilities, useRevokeCapability } from "../../data/useProviderTabs";

function GrantDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (capability: string, reason: string) => void;
  isPending: boolean;
}) {
  const [capability, setCapability] = useState("");
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Grant capability override</DialogTitle>
        <p className="text-xs text-slate-500">
          Use this only when a capability should be granted without a matching verified credential. It&apos;s logged and reversible.
        </p>
        <Input value={capability} onChange={(e) => setCapability(e.target.value)} placeholder="capability key, e.g. otc_medicines" />
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this override needed?" rows={3} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!capability.trim() || !reason.trim() || isPending} onClick={() => onConfirm(capability.trim(), reason.trim())}>
            {isPending ? "Granting…" : "Grant"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CapabilitiesTab = ({ providerId }: { providerId: string }) => {
  const { data, isLoading } = useProviderCapabilities(providerId);
  const grant = useGrantCapabilityOverride(providerId);
  const revoke = useRevokeCapability(providerId);
  const [grantOpen, setGrantOpen] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const rows = data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setGrantOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Grant override
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
          No capabilities granted yet
        </div>
      ) : (
        rows.map((cap) => (
          <div key={cap.capability} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-black text-sm text-slate-800 dark:text-slate-200">{cap.capability_label ?? cap.capability}</div>
              <div className="mt-1 text-xs text-slate-500">
                {cap.source === "credential" ? "Granted by a verified credential" : `Admin override — ${cap.override_reason}`}
                {cap.expires_at && ` · expires ${new Date(cap.expires_at).toLocaleDateString()}`}
              </div>
            </div>
            {cap.source === "admin_override" && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 dark:text-red-400"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(cap.capability)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
              </Button>
            )}
          </div>
        ))
      )}

      <GrantDialog
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        isPending={grant.isPending}
        onConfirm={(capability, reason) =>
          grant.mutate({ capability, reason }, { onSuccess: () => setGrantOpen(false) })
        }
      />
    </div>
  );
};

export default CapabilitiesTab;
