"use client";

import { TPeriodTrackerLog } from "../columns/periodTrackerColumns";
import { Icon } from "@iconify/react";
import moment from "moment";

export const periodTrackerCardConfig = {
  // Mobile Header configuration
  header: (item: TPeriodTrackerLog) => (
    <div className="flex items-center gap-3">
      {item.user_profiles?.avatar_url ? (
        <img
          src={item.user_profiles.avatar_url}
          alt=""
          className="h-10 w-10 rounded-full object-cover border-2 border-primary-100"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center border-2 border-primary-100">
          <Icon icon="heroicons:user" className="h-5 w-5 text-primary-500" />
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {item.user_profiles?.first_name} {item.user_profiles?.last_name}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Goal: {item.goal}
        </span>
      </div>
    </div>
  ),

  // Grid fields configuration
  fields: (item: TPeriodTrackerLog) => [
    {
      label: "Cycle Length",
      value: (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" />
          <span>{item.cycle_length} days</span>
        </div>
      ),
    },
    {
      label: "Period Start",
      value: (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <Icon icon="heroicons:calendar" className="h-3.5 w-3.5" />
          <span>{moment(item.period_start_date).format("MMM D, YYYY")}</span>
        </div>
      ),
    },
    {
      label: "Status",
      value: (
        <div
          className={`px-2 py-0.5 rounded text-[10px] font-medium w-fit ${
            item.is_consistent === "Yes"
              ? "bg-green-100 text-green-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {item.is_consistent === "Yes" ? "Consistent" : "Irregular"}
        </div>
      ),
    },
  ],

  // Mobile-specific actions
  actions: (item: TPeriodTrackerLog, meta: any) => (
    <div className="flex items-center justify-around p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <button
        onClick={() => meta?.onFertileClick?.(item)}
        className="flex flex-col items-center gap-1 text-purple-600"
      >
        <Icon icon="healthicons:sexual-reproductive-health" className="h-5 w-5" />
        <span className="text-[10px]">Fertility</span>
      </button>
      <button
        onClick={() => meta?.onFlowClick?.(item)}
        className="flex flex-col items-center gap-1 text-red-600"
      >
        <Icon icon="bi:droplet-fill" className="h-5 w-5" />
        <span className="text-[10px]">Flow</span>
      </button>
      <button
        onClick={() => meta?.onEdit?.(item)}
        className="flex flex-col items-center gap-1 text-blue-600"
      >
        <Icon icon="heroicons:pencil-square" className="h-5 w-5" />
        <span className="text-[10px]">Edit</span>
      </button>
      <button
        onClick={() => meta?.onDelete?.(item)}
        className="flex flex-col items-center gap-1 text-red-500"
      >
        <Icon icon="heroicons:trash" className="h-5 w-5" />
        <span className="text-[10px]">Delete</span>
      </button>
    </div>
  ),
};
