"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useViewGroupDialog, useAddGroupDialog } from "@/features/chat/data/dialog-hooks";
import { useUpdateConversation } from "@/features/chat/data/useConversation";
import { useUsers } from "@/features/users/data/useUser";
import { useHasPermission } from "@/stores/permission-context";
import { getBrowserClient } from "@/lib/db/browser";
import { groupCategoryLabel, groupTypeLabel } from "@/features/chat/schema/constants";
import { downloadCsv } from "@/lib/csv";

interface GroupAdminRow {
  user_id: string;
  role: string;
  user_profiles: { first_name: string | null; last_name: string | null } | null;
}

// m-view-group port (Gap Analysis Part E): mini KPIs, group-admin manager,
// Suspend/Archive, Export Members, Send Announcement.
export default function ViewGroupDialog() {
  const { isOpen, data, close } = useViewGroupDialog();
  const group = data as any;
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateConversation();
  const addGroupDialog = useAddGroupDialog();
  const canModerate = useHasPermission("chats.moderate");
  const { data: adminsData } = useUsers({ admin: true, page: 1, limit: 100 });
  const [addAdminId, setAddAdminId] = useState("");

  const groupId: string | null = group?.id ?? null;

  const { data: members } = useQuery({
    queryKey: ["group-admins", groupId],
    enabled: isOpen && !!groupId,
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data: rows, error } = await supabase
        .from("conversation_members")
        .select("user_id, role, user_profiles(user_id, first_name, last_name)")
        .eq("conversation_id", groupId!);
      if (error) throw new Error(error.message);
      return (rows ?? []) as unknown as GroupAdminRow[];
    },
  });

  if (!group) return null;

  const admins = (members ?? []).filter((m) =>
    ["admin", "owner", "group_leader"].includes(m.role),
  );

  const creatorName = group.user_profiles
    ? `${group.user_profiles.first_name || ""} ${group.user_profiles.last_name || ""}`.trim()
    : "—";

  const lastMsg = group.last_message;
  const status = group.status ?? "active";

  const setStatus = (next: string) =>
    updateMutation.mutate({ id: group.id, status: next });

  const setMemberRole = async (userId: string, role: string) => {
    const supabase = await getBrowserClient();
    const { error } = await supabase
      .from("conversation_members")
      .update({ role })
      .eq("conversation_id", group.id)
      .eq("user_id", userId);
    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["group-admins", group.id] });
    toast.success(role === "member" ? "Admin removed" : "Admin added");
  };

  const exportMembers = async () => {
    const supabase = await getBrowserClient();
    const { data: rows, error } = await supabase
      .from("conversation_members")
      .select("user_id, role, joined_at, user_profiles(first_name, last_name, phone_number)")
      .eq("conversation_id", group.id);
    if (error) {
      toast.error(`Export failed: ${error.message}`);
      return;
    }
    downloadCsv(
      ((rows ?? []) as any[]).map((m) => ({
        "User ID": m.user_id,
        Name:
          [m.user_profiles?.first_name, m.user_profiles?.last_name]
            .filter(Boolean)
            .join(" ") || "—",
        Phone: m.user_profiles?.phone_number ?? "",
        Role: m.role,
        Joined: (m.joined_at ?? "").slice(0, 10),
      })),
      `group-members-${group.name ?? group.id}`.replace(/\s+/g, "-").toLowerCase(),
    );
  };

  const miniKpis = [
    { label: "Members", value: group.member_count ?? 0, icon: "👥" },
    { label: "Msgs (7d)", value: group.messages_7d ?? 0, icon: "💬" },
    { label: "Admins", value: admins.length, icon: "🛡️" },
    { label: "Flagged", value: group.is_flagged ? 1 : 0, icon: "🚩" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>👥</span>
            <span>{group.name || "Group Details"}</span>
            <span className={`badge ${status === "active" ? "badge-green" : status === "archived" ? "badge-amber" : "badge-slate"} text-3xs capitalize`}>
              {status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {/* Mini KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {miniKpis.map((kpi) => (
              <div key={kpi.label} className="bg-slate-50 rounded-xl border border-slate-100 p-2 text-center">
                <div className="text-sm">{kpi.icon}</div>
                <div className="text-sm font-black text-slate-800">{kpi.value}</div>
                <div className="text-3xs font-black uppercase tracking-wider text-slate-400">
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>

          {/* Group Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Description</span>
              <p className="font-bold text-slate-800 mt-0.5">{group.description || "—"}</p>
            </div>
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Created By</span>
              <p className="font-bold text-slate-800 mt-0.5">{creatorName}</p>
            </div>
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Category</span>
              <p className="font-bold text-slate-800 mt-0.5">{groupCategoryLabel(group.group_category)}</p>
            </div>
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Group Type</span>
              <p className="font-bold text-slate-800 mt-0.5">{groupTypeLabel(group.group_type)}</p>
            </div>
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Max Members</span>
              <p className="font-bold text-slate-800 mt-0.5">{group.max_members ?? "—"}</p>
            </div>
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Region</span>
              <p className="font-bold text-slate-800 mt-0.5 capitalize">{group.region_restriction || "Nationwide"}</p>
            </div>
          </div>

          {group.group_rules && (
            <div>
              <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Group Rules</span>
              <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{group.group_rules}</p>
            </div>
          )}

          {/* Group Admins manager */}
          <Separator />
          <div>
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">
              Group Admins ({admins.length})
            </span>
            <div className="mt-1.5 space-y-1.5">
              {admins.map((admin) => (
                <div key={admin.user_id} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                  <div className="text-xs font-bold text-slate-700">
                    {[admin.user_profiles?.first_name, admin.user_profiles?.last_name]
                      .filter(Boolean)
                      .join(" ") || admin.user_id.slice(0, 8)}
                    <span className="ml-2 badge badge-blue text-3xs capitalize">{admin.role}</span>
                  </div>
                  {canModerate && admin.role !== "owner" && (
                    <button
                      className="text-3xs font-black text-red-500 hover:underline cursor-pointer bg-transparent border-0"
                      onClick={() => setMemberRole(admin.user_id, "member")}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {admins.length === 0 && (
                <p className="text-slate-400 text-xs italic">No admins found</p>
              )}
              {canModerate && (
                <div className="flex gap-2 items-center">
                  <select
                    className="flex-1 h-8 px-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                    value={addAdminId}
                    onChange={(e) => setAddAdminId(e.target.value)}
                  >
                    <option value="">Add admin…</option>
                    {(adminsData?.users ?? []).map((a: any) => (
                      <option key={a.user_id} value={a.user_id}>{a.name || a.email}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary btn-sm h-8"
                    disabled={!addAdminId}
                    onClick={() => {
                      setMemberRole(addAdminId, "admin");
                      setAddAdminId("");
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Last Message */}
          <Separator />
          <div>
            <span className="text-2xs font-black uppercase tracking-wider text-slate-400">Last Message</span>
            {lastMsg ? (
              <div className="mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p className="text-slate-700 text-xs line-clamp-3">{lastMsg.content || "—"}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-2xs font-bold text-slate-500">
                    {lastMsg.sender
                      ? `${lastMsg.sender.first_name || ""} ${lastMsg.sender.last_name || ""}`.trim()
                      : "Unknown"}
                  </span>
                  <span className="text-2xs text-slate-400">
                    {lastMsg.created_at ? new Date(lastMsg.created_at).toLocaleString() : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs mt-1 italic">No messages yet</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {canModerate && (
            <>
              {status !== "inactive" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs font-black uppercase tracking-widest"
                  onClick={() => setStatus("inactive")}
                >
                  ⏸ Suspend Group
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs font-black uppercase tracking-widest"
                  onClick={() => setStatus("active")}
                >
                  ▶ Reactivate
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="text-xs font-black uppercase tracking-widest"
                onClick={exportMembers}
              >
                📥 Export Members
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs font-black uppercase tracking-widest"
                onClick={() => {
                  close();
                  router.push("/notifications");
                }}
              >
                📣 Send Announcement
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs font-black uppercase tracking-widest"
                onClick={() => {
                  close();
                  addGroupDialog.open(group);
                }}
              >
                ✏️ Edit
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={close}
            className="text-xs font-black uppercase tracking-widest"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
