"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddGroupDialog } from "@/stores/dialog-store";
import {
  useCreateConversation,
  useUpdateConversation,
} from "@/hooks/supabase-calls/useConversation";
import { Loader2, Users, ShieldCheck } from "lucide-react";

const CATEGORY_OPTIONS = [
  {
    value: "general",
    label: "💬 General",
    description:
      "A group where anyone and everyone can join with no specific topic.",
  },
  {
    value: "specialty",
    label: "🩺 Specialty",
    description:
      "Discussions focused on specific medical fields or specialties.",
  },
  {
    value: "facility",
    label: "🏥 Facility",
    description: "A private group dedicated to staff of a specific facility.",
  },
  {
    value: "support",
    label: "🎧 Peer Support",
    description: "A safe space for peer-to-peer advice and support.",
  },
  {
    value: "announcements",
    label: "📣 Announcements",
    description: "Broadcast important updates to community members.",
  },
];

const MAX_MEMBERS_DEFAULT = 500;

export default function CreateGroupDialog() {
  const { isOpen, close, data, isEditMode } = useAddGroupDialog();
  const group = data as any;
  const createMutation = useCreateConversation();
  const updateMutation = useUpdateConversation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [isVerifiedOnly, setIsVerifiedOnly] = useState(false);
  const [maxMembers, setMaxMembers] = useState(String(MAX_MEMBERS_DEFAULT));
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing an existing group
  useEffect(() => {
    if (isEditMode && group) {
      setName(group.name || "");
      setDescription(group.description || "");
      setCategory(group.group_category || "general");
      setIsVerifiedOnly(group.is_verified_only ?? false);
      setMaxMembers(
        group.max_members
          ? String(group.max_members)
          : String(MAX_MEMBERS_DEFAULT),
      );
    } else {
      resetForm();
    }
  }, [isEditMode, group]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("general");
    setIsVerifiedOnly(false);
    setMaxMembers(String(MAX_MEMBERS_DEFAULT));
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);

    try {
      if (isEditMode && group?.id) {
        await updateMutation.mutateAsync({
          id: group.id,
          name: name.trim(),
          description: description.trim() || undefined,
          group_category: category,
          is_verified_only: isVerifiedOnly,
          max_members: Number(maxMembers) || MAX_MEMBERS_DEFAULT,
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          group_category: category,
          is_verified_only: isVerifiedOnly,
          max_members: Number(maxMembers) || MAX_MEMBERS_DEFAULT,
        });
      }
      resetForm();
      close();
    } catch {
      // Error toast handled by mutation
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-5 bg-gradient-to-br from-emerald-500 to-emerald-600">
          <DialogTitle className="flex items-center gap-3 text-white">
            <span className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-xl shrink-0">
              👥
            </span>
            <span className="flex-1 text-left">
              <span className="block font-black text-base">
                {isEditMode ? "Edit Group" : "Create New Group"}
              </span>
              <span className="block text-[11px] font-medium text-emerald-50/90">
                {isEditMode
                  ? "Update this community group chat"
                  : "Start a new community group chat"}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Group Name */}
          <div className="space-y-2">
            <Label
              htmlFor="new-group-name"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400"
            >
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="new-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diabetes Support Circle"
              className="h-10 text-sm focus-visible:ring-emerald-500/20"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor="new-group-description"
              className="text-[10px] font-black uppercase tracking-wider text-slate-400"
            >
              Description
            </Label>
            <Textarea
              id="new-group-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              className="text-sm resize-none focus-visible:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category Dropdown (Shadcn) */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full h-14! px-3 rounded-md border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="p-1.5 bg-white">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="py-3 px-3 mb-1 last:mb-0 cursor-pointer items-start rounded-md transition-colors"
                    >
                      <div className="flex flex-col gap-1 text-left pr-2">
                        <span className="font-semibold text-sm text-slate-800">
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-slate-500 whitespace-normal leading-relaxed">
                          {opt.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Max Members */}
            <div className="space-y-2">
              <Label
                htmlFor="new-group-max-members"
                className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1"
              >
                <Users className="w-3 h-3" /> Max Members
              </Label>
              <Input
                id="new-group-max-members"
                type="number"
                min={1}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className="h-10 text-sm focus-visible:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Verified-only toggle */}
          <label className="flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer rounded-xl px-4 py-3 border border-slate-100">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Verified HCPs only
                </p>
                <p className="text-[10px] text-slate-400 leading-snug pr-4">
                  Restrict membership to verified healthcare professionals
                </p>
              </div>
            </div>
            <Checkbox
              checked={isVerifiedOnly}
              onCheckedChange={(checked) => setIsVerifiedOnly(!!checked)}
            />
          </label>

          {error && (
            <p className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-[11px] font-black uppercase tracking-widest h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest h-11 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
