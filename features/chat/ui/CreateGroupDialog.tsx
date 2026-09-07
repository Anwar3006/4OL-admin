"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAddGroupDialog } from "@/features/chat/data/dialog-hooks";
import {
  useCreateConversation,
  useUpdateConversation,
} from "@/features/chat/data/useConversation";
import { useUsers } from "@/features/users/data/useUser";
import { GHANA_REGIONS } from "@/lib/shared-constants";
import {
  GROUP_CATEGORIES,
  GROUP_TYPES,
  GROUP_PERMISSION_OPTIONS,
  GROUP_PERMISSION_DEFAULTS,
  normalizeGroupCategory,
  type GroupPermissionKey,
} from "@/features/chat/schema/constants";
import { Loader2 } from "lucide-react";

const MAX_MEMBERS_DEFAULT = 500;

// Full m-create-group form (Gap Analysis Part E): category (E-D4 vocabulary),
// group type, max members, region restriction (E-D6: all 16 regions),
// 6 permission checkboxes, group rules, optional second group admin.
export default function CreateGroupDialog() {
  const { isOpen, close, data, isEditMode } = useAddGroupDialog();
  const group = data as any;
  const createMutation = useCreateConversation();
  const updateMutation = useUpdateConversation();
  const { data: adminsData } = useUsers({ admin: true, page: 1, limit: 100 });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("community_support");
  const [groupType, setGroupType] = useState("open");
  const [maxMembers, setMaxMembers] = useState(String(MAX_MEMBERS_DEFAULT));
  const [regionRestriction, setRegionRestriction] = useState("");
  const [permissions, setPermissions] = useState<Record<GroupPermissionKey, boolean>>(
    { ...GROUP_PERMISSION_DEFAULTS },
  );
  const [groupRules, setGroupRules] = useState("");
  const [assignAdminId, setAssignAdminId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing an existing group
  useEffect(() => {
    if (isEditMode && group) {
      setName(group.name || "");
      setDescription(group.description || "");
      setCategory(normalizeGroupCategory(group.group_category));
      setGroupType(group.group_type || (group.is_verified_only ? "hcp_verified" : "open"));
      setMaxMembers(
        group.max_members ? String(group.max_members) : String(MAX_MEMBERS_DEFAULT),
      );
      setRegionRestriction(group.region_restriction || "");
      setPermissions({
        ...GROUP_PERMISSION_DEFAULTS,
        ...((group.group_permissions ?? {}) as Record<GroupPermissionKey, boolean>),
      });
      setGroupRules(group.group_rules || "");
      setAssignAdminId("");
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, group]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("community_support");
    setGroupType("open");
    setMaxMembers(String(MAX_MEMBERS_DEFAULT));
    setRegionRestriction("");
    setPermissions({ ...GROUP_PERMISSION_DEFAULTS });
    setGroupRules("");
    setAssignAdminId("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    close();
  };

  const togglePermission = (key: GroupPermissionKey) =>
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    setError(null);

    const shared = {
      name: name.trim(),
      description: description.trim() || undefined,
      group_category: category,
      is_verified_only: groupType === "hcp_verified" || groupType === "verified",
      max_members: Number(maxMembers) || MAX_MEMBERS_DEFAULT,
      group_type: groupType,
      region_restriction: regionRestriction || null,
      group_permissions: permissions,
      group_rules: groupRules.trim() || null,
    };

    try {
      if (isEditMode && group?.id) {
        await updateMutation.mutateAsync({ id: group.id, ...shared });
      } else {
        await createMutation.mutateAsync({
          ...shared,
          assign_admin_id: assignAdminId || null,
        });
      }
      resetForm();
      close();
    } catch {
      // Error toast handled by mutation
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const selectClass =
    "h-10 w-full px-3 rounded-md border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
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
              <span className="block text-xs font-medium text-emerald-50/90">
                {isEditMode
                  ? "Update this community group chat"
                  : "Start a new community group chat"}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Group Name */}
          <div className="space-y-1.5">
            <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diabetes Support Circle"
              className="h-10 text-sm focus-visible:ring-emerald-500/20"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={2}
              className="text-sm resize-none focus-visible:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
                Category
              </Label>
              <select
                className={selectClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {GROUP_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
                Group Type
              </Label>
              <select
                className={selectClass}
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
              >
                {GROUP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
                Max Members (0 = unlimited)
              </Label>
              <Input
                type="number"
                min={0}
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                className="h-10 text-sm focus-visible:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
                Region Restriction
              </Label>
              <select
                className={selectClass}
                value={regionRestriction}
                onChange={(e) => setRegionRestriction(e.target.value)}
              >
                <option value="">Nationwide (all regions)</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {!isEditMode && (
            <div className="space-y-1.5">
              <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
                Assign Group Admin (optional)
              </Label>
              <select
                className={selectClass}
                value={assignAdminId}
                onChange={(e) => setAssignAdminId(e.target.value)}
              >
                <option value="">None — I will be the only admin</option>
                {(adminsData?.users ?? []).map((a: any) => (
                  <option key={a.user_id} value={a.user_id}>
                    {a.name || a.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group permissions */}
          <div className="space-y-2">
            <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
              Group Permissions
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GROUP_PERMISSION_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer rounded-lg px-3 py-2 border border-slate-100"
                >
                  <Checkbox
                    checked={permissions[opt.key]}
                    onCheckedChange={() => togglePermission(opt.key)}
                  />
                  <span className="text-xs font-bold text-slate-600">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Group rules */}
          <div className="space-y-1.5">
            <Label className="text-2xs font-black uppercase tracking-wider text-slate-400">
              Group Rules
            </Label>
            <Textarea
              value={groupRules}
              onChange={(e) => setGroupRules(e.target.value)}
              placeholder="Shown to members on join (e.g. no medical advice without sources, be respectful…)"
              rows={3}
              className="text-sm resize-none focus-visible:ring-emerald-500/20"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs font-black uppercase tracking-widest h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest h-11 transition-all"
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
