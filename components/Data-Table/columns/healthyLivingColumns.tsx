"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Activity, FileText, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

import { useViewHealthyLivingDialog } from "@/stores/dialog-store";
import { THealthyLivingOutput } from "@/schemas/healthyLiving.schema";

export const healthyLivingColumns: ColumnDef<THealthyLivingOutput>[] = [
  {
    accessorKey: "name",
    header: () => <div className="font-semibold">Name</div>,
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-3 min-w-40">
          {/* <Activity className="h-4 w-4 text-emerald-600 shrink-0" /> */}
          <span className="font-bold text-sm bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            {row.original.name}
          </span>
        </div>
      );
    },
  },

// {
//     // parent_path is computed by the healthy_living_info VIEW
//     accessorKey: "parent_path",
//     header: () => (
//       <div className="font-semibold flex items-center gap-1.5">
//         <GitBranch className="h-3.5 w-3.5" />
//         Parent
//       </div>
//     ),
//     cell: ({ row }) => {
//       const path = (row.original as any).parent_path as string | null;
//       const name = row.original.name;

//       // 1. Logic for Root: No path OR path is just the name itself
//       if (!path || path.trim() === name.trim()) {
//         return (
//           <Badge
//             variant="outline"
//             className="text-sm text-slate-400 border-slate-200 font-normal bg-slate-50/50"
//           >
//             Root
//           </Badge>
//         );
//       }

//       // 2. Extract the closest parent
//       // Logic: Split by arrow and take the last element
//       const segments = path.split(" → ");
//       const closestParent = segments[segments.length - 1];

//       return (
//         <div className="flex items-center gap-2">
//           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
//           <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">
//             {closestParent}
//           </span>
//         </div>
//       );
//     },
//   },

  // {
  //   accessorKey: "description",
  //   header: () => (
  //     <div className="font-semibold hidden xl:table-cell">Description</div>
  //   ),
  //   cell: ({ row }) => (
  //     <div className="hidden xl:table-cell text-xs text-muted-foreground max-w-64 truncate">
  //       {row.original.description || (
  //         <span className="italic text-slate-300">No description</span>
  //       )}
  //     </div>
  //   ),
  // },

  {
    accessorKey: "created_at",
    header: () => (
      <div className="font-semibold hidden xl:table-cell">Created</div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell text-xs text-muted-foreground">
        {new Date(row.original.created_at).toLocaleDateString(undefined, {
          dateStyle: "medium",
        })}
      </div>
    ),
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const healthyLiving = row.original;
      const { open: openView } = useViewHealthyLivingDialog();

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Management</DropdownMenuLabel>

              <DropdownMenuItem onClick={() => openView(healthyLiving.id)}>
                <FileText className="mr-2 h-4 w-4" /> View Full Details
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(healthyLiving.id)}
              >
                Copy ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
