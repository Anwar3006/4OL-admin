"use client";

import {
  Stethoscope,
  ExternalLink,
  FileText,
  Activity,
} from "lucide-react";
import { MobileCardConfig } from "../mobile-card-types";

import { Badge } from "@/components/ui/badge";

/**
 * Mobile card configuration for Condition entities
 * Optimized for scannability of medical data on small screens
 */
export const conditionCardConfig: MobileCardConfig<any> = {
  // Header: Focus on Name and Systemic Status
  header: {
    title: (condition) => condition.name,
    subtitle: (condition) => (
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3" />
        <span>{condition.specialist || "General Medicine"}</span>
      </div>
    ),
    badge: (condition) =>
      condition.isSystemic ? (
        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200 text-[10px]">
          Systemic
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px]">
          Localized
        </Badge>
      ),
  },

  // Body Fields: Highlight the "Where" and "Link"
  fields: [
    {
      id: "specialist",
      icon: <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" />,
      label: "Specialist",
      render: (condition) => (
        <span className="font-medium text-sm">
          {condition.specialist || "N/A"}
        </span>
      ),
    },
    {
      id: "nhsLink",
      icon: <ExternalLink className="h-4 w-4 shrink-0 text-blue-500" />,
      render: (condition) => (
        <a
          href={condition.nhsLink ?? "#"}
          target="_blank"
          className="text-blue-600 underline truncate text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          View NHS Guidance
        </a>
      ),
    },
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
