"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Edit,
  Trash2,
  Pill,
  AlertCircle,
  FileText,
  Calendar,
  Ban,
  Activity,
  History,
  Timer,
  ChevronRight,
  Dot,
} from "lucide-react";

import {
  useDeleteMedication,
  useMedicationReminder,
} from "@/hooks/supabase-calls/useMedicationReminder";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewMediactionReminderDialog } from "@/stores/dialog-store";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

const ViewMedicationReminderDialog = () => {
  const { isOpen, close, entityId } = useViewMediactionReminderDialog();
  const { data: session } = useSupabaseSession();
  const adminId = session?.user?.id || "";

  const { data, isLoading } = useMedicationReminder(entityId!);
  const { mutateAsync: deleteReminder } = useDeleteMedication();

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this medication reminder?")) {
      await deleteReminder({ adminId, reminderId: entityId! });
      close();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-white border-l shadow-xl">
        {/* Fix for Accessibility: Title must be available to Screen Readers */}
        <VisuallyHidden.Root>
          <SheetTitle>
            {data
              ? `Medication Details for ${data.drug_name}`
              : "Medication Details"}
          </SheetTitle>
        </VisuallyHidden.Root>

        {!isLoading && data ? (
          <>
            {/* 1. Refined Header */}
            <div className="p-8 pt-12 border-b border-slate-100 relative bg-white">
              <SheetHeader className="space-y-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`rounded-md px-2 py-0 text-[10px] font-bold uppercase tracking-widest ${
                        data.is_enabled
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {data.is_enabled ? "Active" : "Paused"}
                    </Badge>
                    {data.rxcui && (
                      <span className="text-[10px] font-medium text-slate-400 font-mono">
                        #{data.rxcui}
                      </span>
                    )}
                  </div>

                  <h2 className="text-4xl font-bold tracking-tight text-slate-900">
                    {data.drug_name}
                  </h2>

                  {data.generic_name && (
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                      {data.generic_name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    className="rounded-full px-6 bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                  >
                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit Schedule
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    size="icon"
                    className="rounded-full border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>
            </div>

            {/* 2. Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
              {/* Core Stats Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Activity className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Dosage
                    </span>
                  </div>
                  <p className="text-xl font-semibold text-slate-900">
                    {data.dosage_amount}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Timer className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Interval
                    </span>
                  </div>
                  <p className="text-xl font-semibold text-slate-900">
                    Every {data.interval}h
                  </p>
                </div>
              </div>

              {/* Purpose Rendering as Bullet Points */}
              {Array.isArray(data.purpose) && data.purpose.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Medical Purpose
                  </h4>
                  <ul className="space-y-2">
                    {data.purpose.map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed"
                      >
                        <Dot className="h-5 w-5 text-slate-300 shrink-0 mt-[-2px]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Collapsible-style Sections */}
              <div className="space-y-8">
                {data.instructions && (
                  <MedicationSection
                    icon={FileText}
                    title="Instructions"
                    text={data.instructions}
                  />
                )}

                {data.side_effects && (
                  <MedicationSection
                    icon={AlertCircle}
                    title="Side Effects"
                    text={data.side_effects}
                  />
                )}
              </div>

              {/* Timeline Footer */}
              <div className="pt-8 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-50">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Started
                      </p>
                      <p className="text-xs font-medium text-slate-700">
                        {data.start_date
                          ? new Date(data.start_date).toLocaleDateString(
                              undefined,
                              { dateStyle: "medium" },
                            )
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-50">
                    <History className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Duration
                      </p>
                      <p className="text-xs font-medium text-slate-700">
                        {data.end_date
                          ? new Date(data.end_date).toLocaleDateString(
                              undefined,
                              { dateStyle: "medium" },
                            )
                          : "Ongoing"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            {isLoading ? (
              <MedicationSkeleton />
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                  <Ban className="h-6 w-6" />
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  Record not found.
                </p>
                <Button
                  variant="link"
                  onClick={close}
                  className="text-slate-900"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// Simplified Section Component
const MedicationSection = ({
  icon: Icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-slate-900" />
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-900">
        {title}
      </h3>
    </div>
    <p className="text-sm text-slate-600 leading-relaxed pl-5 whitespace-pre-line">
      {text}
    </p>
  </div>
);

function MedicationSkeleton() {
  return (
    <div className="w-full space-y-10">
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export default ViewMedicationReminderDialog;
