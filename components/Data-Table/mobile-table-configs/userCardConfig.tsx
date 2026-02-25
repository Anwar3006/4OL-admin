"use client";

import { Mail, Phone } from "lucide-react";
import { MobileCardConfig } from "../mobile-card-types";
import { StatusMap, RoleMap } from "@/constants/users.const";
import type { TUserProfile } from "@/schemas/user-profile.schema";

/**
 * Mobile card configuration for User entities
 * This defines how user data should be displayed in card format on mobile devices
 */
export const userCardConfig: MobileCardConfig<TUserProfile> = {
  // Header configuration
  header: {
    title: (user) => user.name,
    subtitle: (user) => user.user_type,
    badge: (user) => StatusMap[user.status],
  },

  // Fields to display in card body
  fields: [
    {
      id: "email",
      icon: <Mail className="h-4 w-4 shrink-0" />,
      render: (user) => <span className="truncate">{user.email}</span>,
    },
    {
      id: "phone",
      icon: <Phone className="h-4 w-4 shrink-0" />,
      render: (user) => <span>{user.phone_number}</span>,
    },
    {
      id: "role",
      label: "Role",
      render: (user) => (
        <span className="text-xs font-medium">{RoleMap[user.role]}</span>
      ),
      className: "pt-2 border-t justify-between",
    },
  ],

  // Action menu items
  actions: [
    {
      label: "View Details",
      onClick: (user) => {
        // This will be handled by the card's onClick
        console.log("View details for:", user.user_id);
      },
    },
    {
      label: "Suspend User",
      onClick: (user) => {
        console.log("Suspend user:", user.user_id);
      },
      destructive: true,
    },
  ],

  // Optional: Custom ID getter if your data uses a different field
  getId: (user) => user.user_id,
};
