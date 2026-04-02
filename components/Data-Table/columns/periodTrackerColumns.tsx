"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Icon } from "@iconify/react";
import moment from "moment";
import { Badge } from "@/components/ui/badge";

export type TPeriodTrackerLog = {
  id: string;
  user_id: string;
  period_start_date: string;
  cycle_length: number;
  period_length: number;
  goal: string;
  is_consistent: string;
  ovulation_date: string;
  fertile_window_dates: string[];
  next_reminder: string;
  flow_types: any[];
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    region: string;
    image: string;
  };
};

export const periodTrackerColumns: ColumnDef<TPeriodTrackerLog>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => {
      const user = row.original.user_profiles;
      return (
        <div className="flex items-center space-x-3">
          {user?.image ? (
            <img
              className="w-8 h-8 rounded-full object-cover"
              src={user.image}
              alt=""
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
              <Icon
                icon="heroicons:user"
                className="w-4 h-4 text-gray-500 dark:text-slate-300"
              />
            </div>
          )}
          <span className="font-medium whitespace-nowrap">
            {user?.first_name} {user?.last_name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "user_profiles.email",
    header: "Email",
  },
  {
    accessorKey: "user_profiles.phone_number",
    header: "Phone",
  },
  {
    accessorKey: "goal",
    header: "Goal",
  },
  {
    accessorKey: "cycle_length",
    header: "Cycle",
    cell: ({ row }) => `${row.original.cycle_length}d`,
  },
  {
    accessorKey: "period_length",
    header: "Period",
    cell: ({ row }) => `${row.original.period_length}d`,
  },
  {
    accessorKey: "is_consistent",
    header: "Consistent",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.is_consistent === "Yes"
            ? "bg-green-100 text-green-700"
            : "bg-orange-100 text-orange-700"
        }
      >
        {row.original.is_consistent}
      </Badge>
    ),
  },
  {
    accessorKey: "period_start_date",
    header: "Start",
    cell: ({ row }) =>
      moment(row.original.period_start_date).format("DD/MM/YY"),
  },
  {
    id: "fertile_window",
    header: "Fertile Window",
    cell: ({ row, table }) => {
      const onFertileClick = (table.options.meta as any)?.onFertileClick;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFertileClick?.(row.original);
          }}
          className="text-purple-500 hover:text-purple-700 transition"
        >
          <Icon
            icon="healthicons:sexual-reproductive-health"
            className="w-6 h-6 inline"
          />
        </button>
      );
    },
  },
  {
    id: "flow",
    header: "Flow",
    cell: ({ row, table }) => {
      const onFlowClick = (table.options.meta as any)?.onFlowClick;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFlowClick?.(row.original);
          }}
          className="text-red-500 hover:text-red-700 transition"
        >
          <Icon icon="bi:droplet-fill" className="w-5 h-5 inline" />
        </button>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row, table }) => {
      const onEdit = (table.options.meta as any)?.onEdit;
      const onDelete = (table.options.meta as any)?.onDelete;
      return (
        <div className="flex justify-center items-center gap-3">
          <button
            className="text-gray-400 hover:text-green-500 transition"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(row.original);
            }}
          >
            <Icon icon="heroicons-outline:pencil-alt" className="w-5 h-5" />
          </button>
          <button
            className="text-gray-400 hover:text-red-500 transition"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(row.original);
            }}
          >
            <Icon icon="heroicons-outline:trash" className="w-5 h-5" />
          </button>
        </div>
      );
    },
  },
];
