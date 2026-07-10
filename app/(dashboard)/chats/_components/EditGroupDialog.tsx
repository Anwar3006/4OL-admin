"use client";

import React, { useEffect, useState } from "react";
import Modal from "@/components/redesign/Modal";
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
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`✏️ Edit Group: ${group?.name || ""}`}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={close}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-group-form"
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg bg-ek-green text-white hover:bg-ek-green-dark transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {updateMutation.isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            Save Changes
          </button>
        </div>
      }
    >
      <form id="edit-group-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Group Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-ek-green/20"
            placeholder="Enter group name"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-ek-green/20 resize-none"
            placeholder="Enter group description"
          />
        </div>
      </form>
    </Modal>
  );
}
