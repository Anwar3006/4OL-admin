"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEditGroupDialog } from "@/stores/dialog-store";
import { useUpdateConversation } from "@/hooks/supabase-calls/useConversation";
import { Loader2 } from "lucide-react";

export default function EditGroupDialog() {
  const { isOpen, data, close } = useEditGroupDialog();
  const group = data as any;
  const updateMutation = useUpdateConversation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setDescription(group.description || "");
    }
  }, [group]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group?.id) return;

    try {
      await updateMutation.mutateAsync({ id: group.id, name, description });
      close();
    } catch {
      // Error toast handled by mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✏️</span>
            <span>Edit Group: {group?.name || ""}</span>
          </DialogTitle>
        </DialogHeader>

        <form
          id="edit-group-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label
              htmlFor="group-name"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400"
            >
              Group Name
            </Label>
            <Input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="group-description"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400"
            >
              Description
            </Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description"
              rows={3}
              className="text-xs resize-none"
            />
          </div>
        </form>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={close}
            disabled={updateMutation.isPending}
            className="text-[11px] font-black uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-group-form"
            disabled={updateMutation.isPending}
            className="text-[11px] font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {updateMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
