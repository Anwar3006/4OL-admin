"use client";
import { Pill, Activity, Calendar, FileText, ChevronRight } from "lucide-react";
import { MobileCardConfig } from "../mobile-card-types";
import { TMedicationReminder } from "../columns/medicationReminderColumns";
import { Badge } from "@/components/ui/badge";

export const medicationCardConfig: MobileCardConfig<TMedicationReminder> = {
  header: {
    title: (med) => med.drug_name,
    subtitle: (med) => `${med.dosage_amount} • ${med.drug_type}`,
    badge: (med) => (
      <Badge
        className={
          med.is_active
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-amber-100 text-amber-700 border-amber-200"
        }
      >
        {med.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  fields: [
    {
      id: "protocol",
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
      label: "Cycle",
      render: (med) => (
        <span className="font-bold text-slate-700">
          Every {med.interval} {med.interval_unit}
        </span>
      ),
    },
    {
      id: "instructions",
      icon: <FileText className="h-4 w-4 text-blue-400" />,
      label: "Regimen",
      render: (med) => (
        <span className="text-[11px] leading-relaxed text-slate-500 line-clamp-2 italic">
          {med.instructions.split("•")[1] || med.instructions}
        </span>
      ),
      className: "bg-slate-50 p-3 rounded-xl mt-2 block",
    },
  ],
  actions: [
    {
      label: "Review Clinical Data",
      onClick: (med) =>
        window.open(
          `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${med.rxcui}`,
        ),
    },
    {
      label: "Update Protocol",
      onClick: (med) => console.log("Edit:", med.id),
    },
    {
      label: "Terminate Adherence",
      onClick: (med) => console.log("Delete:", med.id),
      destructive: true,
    },
  ],
  getId: (med) => med.id,
};
