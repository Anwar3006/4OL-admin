"use client";
import { ColumnDef } from "@tanstack/react-table";
import { DeleteAccountRequest, DeleteRequestStatus } from "@/hooks/supabase-calls/useDeleteAccountRequests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, XCircle, Clock, ChevronDown, Eye } from "lucide-react";
import { format } from "date-fns";

// ─── Status badge ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeleteRequestStatus,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: React.FC<any> }
> = {
  pending: {
    label: "Pending",
    variant: "outline",
    icon: ({ className }: any) => <Clock className={`h-3 w-3 text-amber-500 ${className}`} />,
  },
  approved: {
    label: "Approved",
    variant: "destructive",
    icon: ({ className }: any) => <CheckCircle2 className={`h-3 w-3 ${className}`} />,
  },
  rejected: {
    label: "Rejected",
    variant: "secondary",
    icon: ({ className }: any) => <XCircle className={`h-3 w-3 ${className}`} />,
  },
};

function StatusBadge({ status }: { status: DeleteRequestStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge
      variant={cfg.variant}
      className={
        status === "pending"
          ? "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800"
          : status === "approved"
          ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400"
          : "text-slate-500 border-slate-200 bg-slate-50"
      }
    >
      <Icon className="mr-1" />
      {cfg.label}
    </Badge>
  );
}

// ─── Column factory ──────────────────────────────────────────────────────────

interface DeleteAccountColumnsProps {
  onView: (row: DeleteAccountRequest) => void;
  onStatusChange: (requestId: string, userId: string, newStatus: DeleteRequestStatus) => void;
  isSuperAdmin?: boolean;
}

export const createDeleteAccountColumns = ({
  onView,
  onStatusChange,
  isSuperAdmin = false,
}: DeleteAccountColumnsProps): ColumnDef<DeleteAccountRequest>[] => [
  {
    accessorKey: "first_name",
    header: () => <div className="font-semibold">Name</div>,
    cell: ({ row }) => (
      <div className="min-w-[140px]">
        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          {row.original.first_name} {row.original.last_name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{row.original.sex ?? "—"}</p>
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: () => <div className="font-semibold">Email</div>,
    cell: ({ row }) => (
      <span className="text-sm text-slate-700 dark:text-slate-300 min-w-[180px] block">
        {row.original.email}
      </span>
    ),
  },
  {
    accessorKey: "phone_number",
    header: () => <div className="font-semibold hidden md:block">Phone</div>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground hidden md:block min-w-[120px]">
        {row.original.phone_number ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "reason",
    header: () => <div className="font-semibold hidden lg:block">Reason</div>,
    cell: ({ row }) => (
      <p
        className="text-sm text-muted-foreground hidden lg:block max-w-[220px] truncate"
        title={row.original.reason ?? ""}
      >
        {row.original.reason ?? <span className="italic">Not provided</span>}
      </p>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => <div className="font-semibold hidden sm:block">Submitted</div>,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground hidden sm:block min-w-[100px]">
        {format(new Date(row.original.created_at), "MMM d, yyyy")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: () => <div className="font-semibold">Status</div>,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    id: "actions",
    header: () => <div className="font-semibold text-right">Actions</div>,
    cell: ({ row }) => {
      const req = row.original;
      return (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={(e) => {
              e.stopPropagation();
              onView(req);
            }}
            title="View user"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {isSuperAdmin && req.status === "pending" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Update <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(req.id, req.user_id, "approved");
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-slate-600 focus:bg-slate-50 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(req.id, req.user_id, "rejected");
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Non-super-admin read-only status */}
          {!isSuperAdmin && req.status !== "pending" && (
            <StatusBadge status={req.status} />
          )}
        </div>
      );
    },
  },
];
