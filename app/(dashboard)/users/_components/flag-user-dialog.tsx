"use client";

import { useState } from "react";
import { Flag, X, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFlagUserDialog } from "@/stores/dialog-store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function FlagUserDialog() {
  const { isOpen, entityId, data, close } = useFlagUserDialog();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!entityId || !reason.trim()) {
      toast.error("Please provide a reason for flagging this user");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: entityId, reason: reason.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to flag user");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-flagged-users"] });
      queryClient.invalidateQueries({ queryKey: ["user-dashboard-metrics"] });
      toast.success("User flagged successfully");
      setReason("");
      close();
    } catch (error: any) {
      toast.error(error?.message || "Failed to flag user");
      console.error("Error flagging user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason("");
    close();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Flag User</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {data?.name || data?.email || entityId}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-bold mb-1">Warning</p>
              <p>
                Flagging this user will notify the moderation team. Please
                provide a clear reason for your action.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-600">
              Reason for Flagging
            </label>
            <Textarea
              placeholder="Please describe why you are flagging this user..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[120px] resize-none text-sm"
              disabled={isSubmitting}
            />
            <p className="text-[10px] text-slate-400">
              Be specific and provide details about the violation or concern.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-11 font-black uppercase tracking-widest text-[10px]"
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Flagging...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Flag User
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
