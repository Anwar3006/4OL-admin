"use client";
import { ColumnDef } from "@tanstack/react-table";
import { OnboardingRequest, OnboardingRequestStatus } from "@/features/onboarding-requests/data/useOnboardingRequests";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle2, XCircle, Clock, ChevronDown, Trash2, Building2, UserCircle2 } from "lucide-react";
import { format } from "date-fns";

// ─── Status badge ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OnboardingRequestStatus,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: React.FC<any> }
> = {
  pending: {
    label: "Pending",
    variant: "outline",
    icon: ({ className }: any) => <Clock className={`h-3 w-3 text-amber-500 ${className}`} />,
  },
  approved: {
    label: "Approved",
    variant: "default",
    icon: ({ className }: any) => <CheckCircle2 className={`h-3 w-3 ${className}`} />,
  },
  rejected: {
    label: "Rejected",
    variant: "secondary",
    icon: ({ className }: any) => <XCircle className={`h-3 w-3 ${className}`} />,
  },
};

function StatusBadge({ status }: { status: OnboardingRequestStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <Badge
      variant={cfg.variant}
      className={
        status === "pending"
          ? "text-amber-600 dark:text-amber-400 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800"
          : status === "approved"
          ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400"
          : "text-slate-500 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
      }
    >
      <Icon className="mr-1" />
      {cfg.label}
    </Badge>
  );
}

// ─── Type badge ─────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const isFacility = type === 'facility_owner';
  return (
    <Badge variant="outline" className="flex items-center gap-1.5 font-medium border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
      {isFacility ? (
        <>
          <Building2 className="h-3 w-3 text-blue-500" />
          <span>Facility Owner</span>
        </>
      ) : (
        <>
          <UserCircle2 className="h-3 w-3 text-purple-500" />
          <span>IBP Invite</span>
        </>
      )}
    </Badge>
  );
}

// ─── Column factory ──────────────────────────────────────────────────────────

interface OnboardingColumnsProps {
  onUpdateStatus: (id: string, status: OnboardingRequestStatus) => void;
  onDelete: (id: string) => void;
}

export const createOnboardingColumns = ({
  onUpdateStatus,
  onDelete,
}: OnboardingColumnsProps): ColumnDef<OnboardingRequest>[] => [
  {
    accessorKey: "business_name",
    header: () => <div className="font-semibold">Business / Name</div>,
    cell: ({ row }) => (
      <div className="min-w-[160px]">
        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          {row.original.business_name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {row.original.first_name} {row.original.last_name}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "request_type",
    header: () => <div className="font-semibold">Type</div>,
    cell: ({ row }) => <TypeBadge type={row.original.request_type} />,
  },
  {
    accessorKey: "email",
    header: () => <div className="font-semibold">Contact</div>,
    cell: ({ row }) => (
      <div className="min-w-[180px]">
        <p className="text-sm text-slate-700 dark:text-slate-300">{row.original.email}</p>
        {row.original.phone_number && (
          <p className="text-xs text-muted-foreground">{row.original.phone_number}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => <div className="font-semibold hidden sm:block">Submitted</div>,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground hidden sm:block">
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
          {req.status === "pending" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Manage <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="text-green-600 dark:text-green-400 focus:text-green-600 focus:bg-green-50 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(req.id, "approved");
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(req.id, "rejected");
                  }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button aria-label="Delete"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Are you sure you want to delete this request?")) {
                onDelete(req.id);
              }
            }}
            title="Delete request"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    },
  },
];
