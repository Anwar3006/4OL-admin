"use client";

import { MobileCardConfig } from "../mobile-card-types";
import { TPeriodTrackerLog } from "../columns/periodTrackerColumns";
import { Icon } from "@iconify/react";
import moment from "moment";

export const periodTrackerCardConfig: MobileCardConfig<TPeriodTrackerLog> = {
  // Mobile Header configuration
  header: {
    title: (item) => `${item.user_profiles?.first_name} ${item.user_profiles?.last_name}`,
    subtitle: (item) => `Goal: ${item.goal}`,
    badge: (item) => (
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

  // Grid fields configuration
  fields: [
    {
      id: "cycle_length",
      label: "Cycle Length",
      icon: <Icon icon="heroicons:arrow-path" className="h-3.5 w-3.5" />,
      render: (item) => <span>{item.cycle_length} days</span>,
    },
    {
      id: "period_start",
      label: "Period Start",
      icon: <Icon icon="heroicons:calendar" className="h-3.5 w-3.5" />,
      render: (item) => <span>{moment(item.period_start_date).format("MMM D, YYYY")}</span>,
    },
  ],

  // Mobile-specific actions - mapped to MobileCardAction format
  actions: [
    {
      label: "Fertility",
      onClick: (item) => console.log("Fertility for:", item.id), // placeholder as meta is not easily passed here
    },
    {
      label: "Flow",
      onClick: (item) => console.log("Flow for:", item.id),
    },
    {
      label: "Edit",
      onClick: (item) => console.log("Edit:", item.id),
    },
    {
      label: "Delete",
      onClick: (item) => console.log("Delete:", item.id),
      destructive: true,
    },
  ],
  getId: (item) => item.id,
};
