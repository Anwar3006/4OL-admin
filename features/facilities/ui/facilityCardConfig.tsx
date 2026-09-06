"use client";

import { Mail, Phone, MapPin, Star } from "lucide-react";
import { MobileCardConfig } from "@/components/Data-Table/mobile-card-types";
import { StatusMap } from "@/constants/facility.const";
import { toUppercaseFirstLetter } from "@/lib/utils";
import {
  useAddFacilityDialog,
  useViewFacilityDialog,
} from "@/stores/dialog-store";

type FacilityRow = {
  id: string;
  facility_type: string;
  facility_name: string;
  email: string;
  contact_number: string;
  region: string;
  status: "pending" | "active" | "inactive" | "rejected";
};

/**
 * We wrap the config in a hook so we can access the dialog stores safely.
 */
export const useFacilityCardConfig = () => {
  const { open: openEdit } = useAddFacilityDialog();
  const { open: openView } = useViewFacilityDialog();

  const config: MobileCardConfig<FacilityRow> = {
    header: {
      title: (facility) => facility.facility_name,
      subtitle: (facility) =>
        facility.facility_type
          .replaceAll("_", " ")
          .split(" ")
          .map(toUppercaseFirstLetter)
          .join(" "),
      badge: (facility) => StatusMap[facility.status],
    },

    fields: [
      {
        id: "email",
        icon: <Mail className="h-4 w-4 shrink-0" />,
        render: (facility) => (
          <span className="truncate">{facility.email}</span>
        ),
      },
      {
        id: "phone",
        icon: <Phone className="h-4 w-4 shrink-0" />,
        render: (facility) => <span>{facility.contact_number}</span>,
      },
      {
        id: "region",
        icon: <MapPin className="h-4 w-4 shrink-0" />,
        label: "Region",
        render: (facility) => (
          <span className="text-xs font-medium">
            {facility.region.split(" ").map(toUppercaseFirstLetter).join(" ")}
          </span>
        ),
        className: "pt-2 border-t justify-end",
      },
    ],

    actions: [
      {
        label: "Copy Facility ID",
        onClick: (facility) => {
          navigator.clipboard.writeText(facility.id);
        },
        separator: true,
      },
      {
        label: "View Details",
        onClick: (facility) => {
          openView(facility.id); // Now safely available
        },
      },
      {
        label: "Edit Facility",
        onClick: (facility) => {
          openEdit(facility); // Now safely available
        },
        separator: true,
      },
      {
        label: "Deactivate",
        onClick: (facility) => {
          console.log("Deactivate facility:", facility.id);
        },
        destructive: true,
      },
    ],

    getId: (facility) => facility.id,
  };

  return config;
};
