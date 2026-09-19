"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useHasPermission } from "@/stores/permission-context";

export default function QuickActionsRail() {
  const router = useRouter();
  const canBroadcast = useHasPermission("notifications.create");
  const canManagePlans = useHasPermission("subscriptions.manage");
  const canViewSecurity = useHasPermission("security.view");
  const canViewChats = useHasPermission("chats.view");

  const actions = [
    canBroadcast && { icon: "📣", label: "Broadcast", onClick: () => router.push("/notifications") },
    canManagePlans && {
      icon: "🗂️",
      label: "New Plan",
      onClick: () => router.push("/subscriptions?tab=plans&create=1"),
    },
    canViewSecurity && { icon: "🔐", label: "Security", onClick: () => router.push("/security") },
    // Same destination the shell's SupportMessagesButton already links to.
    canViewChats && { icon: "💬", label: "Support", onClick: () => router.push("/chats?tab=support") },
  ].filter(Boolean) as { icon: string; label: string; onClick: () => void }[];

  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="text-sm font-semibold">Quick Actions</div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-xs text-slate-400">No actions available for your role.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 px-3 py-2.5 text-left transition-colors"
              >
                <span className="text-base leading-none">{action.icon}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
