"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Trash2,
  AlertCircle,
  FileText,
  Calendar,
  Ban,
  Activity,
  History,
  Timer,
  Dot,
  Bell,
  Repeat,
} from "lucide-react";

import {
  useDeleteMedication,
  useMedicationReminder,
  formatReminderInterval,
} from "@/features/medication-reminder/data/useMedicationReminder";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewMediactionReminderDialog } from "@/features/medication-reminder/data/dialog-hooks";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const ViewMedicationReminderDialog = () => {
  const { isOpen, close, entityId } = useViewMediactionReminderDialog();
  const { data: session } = useSupabaseSession();
  const adminId = session?.user?.id || "";
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  const { data, isLoading } = useMedicationReminder(entityId!);
  const { mutateAsync: deleteReminder } = useDeleteMedication();

  // Senior Approach: `purpose`, `week_days`, and `selected_days` are jsonb
  // columns but can come back as a JSON-encoded string depending on how the
  // row was written (e.g. "[\"Test\"]"). Parse defensively so real data
  // doesn't silently disappear behind a strict Array.isArray check.
  const toArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const purposeList = toArray(data?.purpose);
  const weekDaysList = toArray(data?.week_days);
  const selectedDaysList = toArray(data?.selected_days);
  const activeDays = weekDaysList.length ? weekDaysList : selectedDaysList;

  const handleDelete = async () => {
    await deleteReminder({ adminId, reminderId: entityId! });
    setConfirmDeleteOpen(false);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col gap-0">
        
        {/* Accessibility Title */}
        <VisuallyHidden.Root>
          <DialogTitle>
            {data ? `Medication Details for ${data.drug_name}` : "Medication Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {!isLoading && data ? (
          <>
            {/* 1. Emerald & White Header */}
            <div className="p-8 pb-6 border-b border-emerald-50 relative bg-white shrink-0">
              <DialogHeader className="text-left relative z-10">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${
                          data.is_enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}
                      >
                        {data.is_enabled ? "Active" : "Paused"}
                      </Badge>
                      {data.drug_type && (
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border bg-slate-50 text-slate-600 border-slate-200 capitalize"
                        >
                          {data.drug_type}
                        </Badge>
                      )}
                      {data.rxcui && (
                        <span className="text-[10px] font-medium text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          RXCUI: {data.rxcui}
                        </span>
                      )}
                    </div>

                    <div>
                      <DialogTitle className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        {data.drug_color && (
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/5"
                            style={{ backgroundColor: data.drug_color }}
                          />
                        )}
                        {data.drug_name}
                      </DialogTitle>
                      {data.generic_name && (
                        <p className="text-sm font-medium text-emerald-700/70 uppercase tracking-wide mt-1">
                          {data.generic_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => setConfirmDeleteOpen(true)}
                    variant="outline"
                    size="icon"
                    className="rounded-full border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 bg-slate-50/50 custom-scrollbar">
              
              {/* Core Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Activity className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Dosage
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {data.dosage_amount}
                  </p>
                </div>
                
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Timer className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Interval
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {formatReminderInterval(data.interval, data.interval_unit)}
                  </p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-2 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Repeat className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Daily Intakes
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800">
                    {data.number_of_intakes ?? "—"}
                  </p>
                </div>
              </div>

              {/* Schedule Details */}
              {(data.notification_schedule || data.last_sent_at || activeDays.length > 0 || data.gap_days || data.schedule_gap) && (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100/50">
                      <Bell className="h-4 w-4" />
                    </div>
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-900">
                      Schedule
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {data.notification_schedule && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400">Frequency</p>
                        <p className="text-sm font-semibold text-slate-700">{data.notification_schedule}</p>
                      </div>
                    )}

                    {(data.gap_days || data.schedule_gap) && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400">Gap Between Doses</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {data.gap_days ?? data.schedule_gap} day{(data.gap_days ?? data.schedule_gap) === 1 ? "" : "s"}
                        </p>
                      </div>
                    )}

                    {data.last_sent_at && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400">Last Sent</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {new Date(data.last_sent_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    )}
                  </div>

                  {activeDays.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Active Days</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeDays.map((day: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-100"
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Purpose Rendering */}
              {purposeList.length > 0 && (
                <div className="space-y-3 px-1">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Medical Purpose
                  </h4>
                  <ul className="space-y-2.5">
                    {purposeList.map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-slate-700 text-sm font-medium leading-relaxed"
                      >
                        <Dot className="h-6 w-6 text-emerald-500 shrink-0 mt-[-3px] ml-[-8px]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Collapsible-style Sections */}
              <div className="space-y-4">
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
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2 bg-emerald-50 rounded-full text-emerald-600">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Started
                      </p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {data.start_date
                          ? new Date(data.start_date).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-2 bg-emerald-50 rounded-full text-emerald-600">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase text-slate-400">
                        Duration
                      </p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {data.end_date
                          ? new Date(data.end_date).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "Ongoing"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px] text-center bg-white">
            {isLoading ? (
              <MedicationSkeleton />
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto border border-slate-100">
                  <Ban className="h-8 w-8" />
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  Record not found or unavailable.
                </p>
                <Button variant="ghost" onClick={close} className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50">
                  Close Window
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      <DeleteConfirmationModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Medication Reminder"
        itemName={data?.drug_name || ""}
        itemType="medication reminder"
      />
    </Dialog>
  );
};

// Sub-component styled for the Emerald theme
const MedicationSection = ({
  icon: Icon,
  title,
  text,
}: {
  icon: any;
  title: string;
  text: string;
}) => (
  <div className="space-y-3 bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100/50">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-emerald-900">
        {title}
      </h3>
    </div>
    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line px-1">
      {text}
    </p>
  </div>
);

// Updated Skeleton for the Dialog layout
function MedicationSkeleton() {
  return (
    <div className="w-full space-y-10 px-8 py-4">
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4 rounded-xl" />
        <Skeleton className="h-4 w-1/4 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-5/6 rounded-md" />
        <Skeleton className="h-4 w-4/6 rounded-md" />
      </div>
    </div>
  );
}

export default ViewMedicationReminderDialog;