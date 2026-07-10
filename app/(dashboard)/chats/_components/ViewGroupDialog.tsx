"use client";

import React from "react";
import Modal from "@/components/redesign/Modal";
import { useViewGroupDialog } from "@/stores/dialog-store";

export default function ViewGroupDialog() {
  const { isOpen, data, close } = useViewGroupDialog();
  const group = data as any;

  if (!group) return null;

  const creatorName = group.user_profiles
    ? `${group.user_profiles.first_name || ""} ${group.user_profiles.last_name || ""}`.trim()
    : "—";

  const lastMsg = group.last_message;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title={`👥 ${group.name || "Group Details"}`}
    >
      <div className="space-y-4 text-xs">
        {/* Group Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Name
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {group.name || "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Description
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {group.description || "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Members
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {group.member_count ?? 0}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Created By
            </span>
            <p className="font-bold text-slate-800 mt-0.5">{creatorName}</p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Created At
            </span>
            <p className="font-bold text-slate-800 mt-0.5">
              {group.created_at
                ? new Date(group.created_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Status
            </span>
            <p className="font-bold text-slate-800 mt-0.5 capitalize">
              {group.status || "Active"}
            </p>
          </div>
        </div>

        {/* Last Message */}
        <div className="border-t border-slate-100 pt-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Last Message
          </span>
          {lastMsg ? (
            <div className="mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <p className="text-slate-700 text-[11px] line-clamp-3">
                {lastMsg.content || "—"}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] font-bold text-slate-500">
                  {lastMsg.sender
                    ? `${lastMsg.sender.first_name || ""} ${lastMsg.sender.last_name || ""}`.trim()
                    : "Unknown"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {lastMsg.created_at
                    ? new Date(lastMsg.created_at).toLocaleString()
                    : ""}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-[11px] mt-1 italic">
              No messages yet
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
