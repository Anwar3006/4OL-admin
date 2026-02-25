"use client";

import {
  Stethoscope,
  Dna,
  ExternalLink,
  LayoutGrid,
  FileText,
  Activity,
} from "lucide-react";
import { MobileCardConfig } from "../mobile-card-types";

import { Badge } from "@/components/ui/badge";
import { THealthyLivingOutput } from "@4ol/db/schemas/healthyLiving.schema";

/**
 * Mobile card configuration for Condition entities
 * Optimized for scannability of medical data on small screens
 */
export const healthyLivingCardConfig: MobileCardConfig<any> = {
  // Header: Focus on Name and Systemic Status
  header: {
    title: (healthyLiving) => healthyLiving.name,
    subtitle: (healthyLiving) => (
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3" />
        <span>{healthyLiving.slug}</span>
      </div>
    ),
  },

  // Body Fields: Highlight the "Where" and "Link"
  fields: [
    // {
    //   id: "nhsLink",
    //   icon: <ExternalLink className="h-4 w-4 shrink-0 text-blue-500" />,
    //   render: (condition) => (
    //     <a
    //       href={condition.nhsLink ?? "#"}
    //       target="_blank"
    //       className="text-blue-600 underline truncate text-sm"
    //       onClick={(e) => e.stopPropagation()}
    //     >
    //       View NHS Guidance
    //     </a>
    //   ),
    // },
    {
      id: "slug",
      icon: <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />,
      label: "Slug",
      render: (condition) => (
        <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded italic">
          {condition.slug}
        </code>
      ),
      className: "pt-2 border-t justify-between",
    },
  ],

  // Actions: Management and Navigation
  actions: [
    {
      label: "Copy Slug",
      onClick: (condition) => {
        navigator.clipboard.writeText(condition.slug);
      },
      //   icon: <FileText className="h-4 w-4 mr-2" />,
      separator: true,
    },
    {
      label: "View Full Content",
      onClick: (condition) => {
        // This would typically trigger your useViewConditionDialog store
        console.log("Opening Sheet for:", condition.id);
      },
    },
    {
      label: "Edit Condition",
      onClick: (condition) => {
        console.log("Navigate to Edit for:", condition.id);
      },
      separator: true,
    },
    {
      label: "Delete Entry",
      onClick: (condition) => {
        console.log("Delete triggered for:", condition.id);
      },
      destructive: true,
    },
  ],

  getId: (condition) => condition.id,
};
