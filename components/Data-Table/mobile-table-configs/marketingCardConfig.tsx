"use client";

import { Calendar, Building2, FileText } from "lucide-react";
import { MobileCardConfig } from "../mobile-card-types";
import { MarketingStatusMap } from "@/constants/marketing.const";
import { TMarketingProfileOutput } from "@/schemas/marketing-profile.schema";

/**
 * Mobile card configuration for Marketing entities
 * This defines how marketing campaign data should be displayed in card format on mobile devices
 */
export const marketingCardConfig: MobileCardConfig<TMarketingProfileOutput> = {
  // Header configuration
  header: {
    title: (campaign) => campaign.headline,
    subtitle: (campaign) => campaign.marketingType,
    badge: (campaign) => MarketingStatusMap[campaign.status],
  },

  // Fields to display in card body
  fields: [
    {
      id: "organization",
      icon: <Building2 className="h-4 w-4 shrink-0" />,
      label: "Organization",
      render: (campaign) => <span>{campaign.organization}</span>,
    },
    {
      id: "dates",
      icon: <Calendar className="h-4 w-4 shrink-0" />,
      label: "Duration",
      render: (campaign) => (
        <span className="text-xs">
          {campaign.startDate} - {campaign.endDate}
        </span>
      ),
      className: "pt-2 border-t gap-3 justify-end",
    },
  ],

  // Action menu items
  actions: [
    {
      label: "Copy Campaign ID",
      onClick: (campaign) => {
        navigator.clipboard.writeText(campaign.id);
      },
      separator: true,
    },
    {
      label: "View Details",
      onClick: (campaign) => {
        console.log("View details for:", campaign.id);
      },
    },
    {
      label: "Edit Campaign",
      onClick: (campaign) => {
        console.log("Edit campaign:", campaign.id);
      },
      separator: true,
    },
    {
      label: "Pause Campaign",
      onClick: (campaign) => {
        console.log("Pause campaign:", campaign.id);
      },
    },
    {
      label: "Delete Campaign",
      onClick: (campaign) => {
        console.log("Delete campaign:", campaign.id);
      },
      destructive: true,
    },
  ],

  getId: (campaign) => campaign.id,
};
