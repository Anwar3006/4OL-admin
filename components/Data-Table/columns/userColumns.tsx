"use client";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Mail, Phone, Edit, FileText, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusMap } from "@/constants/users.const";
import type { TUserProfile } from "@/schemas/user-profile.schema";

import { useDialogStore, useViewUserDialog, useMakeGroupLeaderDialog } from "@/stores/dialog-store";

const formatDate = (value: any) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
};

const formatLastActivity = (value: any) => {
  if (!value) return "N/A";
  const asNumber = Number(value);
  const date =
    Number.isFinite(asNumber) && asNumber > 0
      ? new Date(asNumber > 1e12 ? asNumber : asNumber * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export const userColumns: ColumnDef<TUserProfile>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Name</div>,
    cell: ({ row }) => {
      // `name` comes from the BetterAuth join; fall back to first_name + last_name
      // from user_profiles in case BetterAuth stored name as null.
      const displayName =
        (row.original as any).name ||
        [(row.original as any).first_name, (row.original as any).last_name]
          .filter(Boolean)
          .join(" ") ||
        "—";
      return (
        <div className="flex flex-col min-w-37.5">
          <div className="font-medium text-sm">{displayName}</div>
          <div className="text-xs text-muted-foreground md:hidden truncate">
            {row.original.email}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: () => (
      <div className="font-semibold hidden md:table-cell">Email</div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-45">
        <div className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm truncate">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: () => (
      <div className="font-semibold hidden lg:table-cell">Phone</div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell min-w-35">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{row.original.phone_number}</span>
        </div>
      </div>
    ),
  },
  // {
  //   accessorKey: "role",
  //   header: () => (
  //     <div className="font-semibold hidden xl:table-cell">Role</div>
  //   ),
  //   cell: ({ row }) => (
  //     <div className="hidden xl:table-cell min-w-30">
  //       <span className="text-sm capitalize">{(row.original as any).position || row.original.role}</span>
  //     </div>
  //   ),
  // },
/*
  {
    accessorKey: "sex",
    header: () => (
      <div className="font-semibold hidden xl:table-cell">Sex</div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell min-w-20">
        <span className="text-sm capitalize">{row.original.sex || "N/A"}</span>
      </div>
    ),
  },
*/
  {
    accessorKey: "created_at",
    header: () => (
      <div className="font-semibold hidden 2xl:table-cell">Registration Date</div>
    ),
    cell: ({ row }) => (
      <div className="hidden 2xl:table-cell min-w-35">
        <span className="text-sm">{formatDate(row.original.created_at)}</span>
      </div>
    ),
  },
  {
    accessorKey: "last_activity",
    header: () => (
      <div className="font-semibold hidden 2xl:table-cell">Last Active</div>
    ),
    cell: ({ row }) => (
      <div className="hidden 2xl:table-cell min-w-40">
        <span className="text-sm">{formatLastActivity((row.original as any).last_activity)}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold">Status</div>,
    cell: ({ row }) => (
      <div className="min-w-25">{StatusMap[row.original.status] || row.original.status}</div>
    ),
  },
/*
  {
    accessorKey: "userType",
    header: () => (
      <div className="font-semibold hidden 2xl:table-cell">Type</div>
    ),
    cell: ({ row }) => (
      <div className="hidden 2xl:table-cell min-w-25">
        <span className="text-sm">{row.original.user_type}</span>
      </div>
    ),
  },
*/
  {
    id: "actions",
    header: () => <div className="sr-only">Actions</div>,
    cell: ({ row }) => {
      const user = row.original;
      const { open: openView } = useViewUserDialog();
      const { open: openMakeLeader } = useMakeGroupLeaderDialog();

      return (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => {
              e.stopPropagation();
              openView(user.user_id);
            }}
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
            title="Make Group Leader"
            onClick={(e) => {
              e.stopPropagation();
              openMakeLeader(user.user_id, user);
            }}
          >
            <UserPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
            title="Suspend User"
            onClick={(e) => {
              e.stopPropagation();
              // handle suspend
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
