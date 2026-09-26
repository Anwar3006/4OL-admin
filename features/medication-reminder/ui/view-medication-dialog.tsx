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
  User,
  TrendingUp,
  Pill,
  Clock,
} from "lucide-react";

import {
  useDeleteMedication,
  useMedicationReminder,
  formatReminderInterval,
  type LoggedReminderRow,
} from "@/features/medication-reminder/data/useMedicationReminder";
import { Skeleton } from "@/components/ui/skeleton";
import { useViewMediactionReminderDialog } from "@/features/medication-reminder/data/dialog-hooks";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { usePermissionContext } from "@/stores/permission-context";
import { maskName } from "@/lib/masking";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

const ViewMedicationReminderDialog = () => {
  const { isOpen, close, entityId, data: listRow } =
    useViewMediactionReminderDialog<LoggedReminderRow>();
  const { data: session } = useSupabaseSession();
  const adminId = session?.user?.id || "";
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  // PHI policy mirrors the Logged Reminders table: full identifiers only for
  // super_admin (permissions === null); everyone else sees masked values.
  const { userRole } = usePermissionContext();
  const isSuperAdmin = userRole === "super_admin";

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

  // Drug-catalogue columns the bespoke layout previously dropped. `data` is a
  // `select("*")` row, so every medication_reminders column is available.
  const conditionsList = toArray(data?.conditions_treated);
  const strengthLabel = data?.strength
    ? `${data.strength}${data.strength_unit ? ` ${data.strength_unit}` : ""}`
    : null;

  // Patient + adherence come from the logged-reminders list row passed
  // through the dialog store -- the detail re-fetch (select "*" on
  // medication_reminders) has neither the user_profiles join nor the
  // adherence aggregates.
  const patient = listRow?.user_profiles;
  const adherenceRate = listRow?.adherence_rate ?? null;
  const hasAdherence =
    adherenceRate != null ||
    listRow?.adherence_total != null ||
    (listRow?.missed_count ?? 0) > 0 ||
    (listRow?.skipped_count ?? 0) > 0;

  const handleDelete = async () => {
    await deleteReminder({ adminId, reminderId: entityId! });
    setConfirmDeleteOpen(false);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white dark:bg-slate-800 border-0 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col gap-0">
        
        {/* Accessibility Title */}
        <VisuallyHidden.Root>
          <DialogTitle>
            {data ? `Medication Details for ${data.drug_name}` : "Medication Details"}
          </DialogTitle>
        </VisuallyHidden.Root>

        {!isLoading && data ? (
          <>
            {/* 1. Emerald & White Header */}
            <div className="p-8 pb-6 border-b border-emerald-50 relative bg-white dark:bg-slate-800 shrink-0">
              <DialogHeader className="text-left relative z-10">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={`rounded-md px-2.5 py-0.5 text-2xs font-bold uppercase tracking-widest border ${
                          data.is_enabled
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {data.is_enabled ? "Active" : "Paused"}
                      </Badge>
                      {typeof data.is_active === "boolean" && (
                        <Badge
                          variant="secondary"
                          className={`rounded-md px-2.5 py-0.5 text-2xs font-bold uppercase tracking-widest border ${
                            data.is_active
                              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200"
                              : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {data.is_active ? "Active course" : "Inactive course"}
                        </Badge>
                      )}
                      {data.drug_type && (
                        <Badge
                          variant="secondary"
                          className="rounded-md px-2.5 py-0.5 text-2xs font-bold uppercase tracking-widest border bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 capitalize"
                        >
                          {data.drug_type}
                        </Badge>
                      )}
                      {data.rxcui && (
                        <span className="text-2xs font-medium text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800">
                          RXCUI: {data.rxcui}
                        </span>
                      )}
                    </div>

                    <div>
                      <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        {data.drug_color && (
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/5"
                            style={{ backgroundColor: data.drug_color }}
                          />
                        )}
                        {data.drug_name}
                      </DialogTitle>
                      {data.generic_name && (
                        <p className="text-sm font-medium text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-wide mt-1">
                          {data.generic_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => setConfirmDeleteOpen(true)}
                    variant="outline"
                    size="icon"
                    className="rounded-full border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 bg-slate-50/50 dark:bg-slate-900/50 custom-scrollbar">
              
              {/* Core Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/30 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Activity className="h-4 w-4" />
                    <span className="text-2xs font-bold uppercase tracking-wider">
                      Dosage
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                    {data.dosage_amount}
                  </p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/30 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Timer className="h-4 w-4" />
                    <span className="text-2xs font-bold uppercase tracking-wider">
                      Interval
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                    {formatReminderInterval(data.interval, data.interval_unit)}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/30 shadow-sm space-y-2 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Repeat className="h-4 w-4" />
                    <span className="text-2xs font-bold uppercase tracking-wider">
                      Daily Intakes
                    </span>
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200">
                    {data.number_of_intakes ?? "—"}
                  </p>
                </div>
              </div>

              {/* Medication details (drug-catalogue columns from select("*")) */}
              {(data.manufacturer || strengthLabel || data.dosage_form || conditionsList.length > 0) && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100/50">
                      <Pill className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900 dark:text-emerald-300">
                      Medication Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {data.manufacturer && (
                      <div className="space-y-1">
                        <p className="text-3xs font-bold uppercase text-slate-400">Manufacturer</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {data.manufacturer}
                        </p>
                      </div>
                    )}
                    {strengthLabel && (
                      <div className="space-y-1">
                        <p className="text-3xs font-bold uppercase text-slate-400">Strength</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {strengthLabel}
                        </p>
                      </div>
                    )}
                    {data.dosage_form && (
                      <div className="space-y-1">
                        <p className="text-3xs font-bold uppercase text-slate-400">Dosage form</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">
                          {data.dosage_form}
                        </p>
                      </div>
                    )}
                  </div>
                  {conditionsList.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                      <p className="text-3xs font-bold uppercase text-slate-400">Conditions treated</p>
                      <div className="flex flex-wrap gap-1.5">
                        {conditionsList.map((item: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-2xs font-bold capitalize border border-emerald-100 dark:border-emerald-500/30"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Patient (PHI-masked unless super_admin) */}
              {patient && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100/50">
                      <User className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900 dark:text-emerald-300">
                      Patient
                    </h3>
                    {!isSuperAdmin && (
                      <span className="ml-auto text-2xs font-semibold text-slate-400">
                        🔒 Masked for your role
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">Name</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {isSuperAdmin
                          ? patient.name || "Unknown User"
                          : maskName(patient.name || "")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">User ID</p>
                      <p className="text-sm font-semibold font-mono text-slate-700 dark:text-slate-300">
                        {isSuperAdmin
                          ? patient.public_id ||
                            (patient.user_id
                              ? `4OL-${patient.user_id.slice(0, 6)}`
                              : "—")
                          : "4OL-••••••"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">Region</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {patient.region || "Not recorded"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Adherence + delivery (from the logged-reminders list row) */}
              {hasAdherence && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100/50">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900 dark:text-emerald-300">
                      Adherence
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">Rate</p>
                      <p
                        className={`text-xl font-black tabular-nums ${
                          adherenceRate == null
                            ? "text-slate-400"
                            : adherenceRate >= 80
                              ? "text-emerald-600"
                              : adherenceRate >= 65
                                ? "text-amber-600"
                                : "text-red-600"
                        }`}
                      >
                        {adherenceRate == null ? "—" : `${adherenceRate}%`}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">Logged doses</p>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-200 tabular-nums">
                        {listRow?.adherence_total?.toLocaleString() ?? "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">Missed</p>
                      <p className="text-xl font-black text-red-600 tabular-nums">
                        {listRow?.missed_count ?? 0}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xs font-bold uppercase text-slate-400">Skipped</p>
                      <p className="text-xl font-black text-amber-600 tabular-nums">
                        {listRow?.skipped_count ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="text-2xs text-slate-400 font-medium pt-3 border-t border-slate-50 dark:border-slate-700/50">
                    Pharmacy campaign delivery is not tracked per reminder in the
                    current schema; notification delivery state lives in Schedule
                    above (Last Sent).
                  </p>
                </div>
              )}

              {/* Schedule Details */}
              {(data.notification_schedule || data.last_sent_at || activeDays.length > 0 || data.gap_days || data.schedule_gap) && (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/30/50">
                      <Bell className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900">
                      Schedule
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {data.notification_schedule && (
                      <div className="space-y-1">
                        <p className="text-3xs font-bold uppercase text-slate-400">Frequency</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{data.notification_schedule}</p>
                      </div>
                    )}

                    {(data.gap_days || data.schedule_gap) && (
                      <div className="space-y-1">
                        <p className="text-3xs font-bold uppercase text-slate-400">Gap Between Doses</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {data.gap_days ?? data.schedule_gap} day{(data.gap_days ?? data.schedule_gap) === 1 ? "" : "s"}
                        </p>
                      </div>
                    )}

                    {data.last_sent_at && (
                      <div className="space-y-1">
                        <p className="text-3xs font-bold uppercase text-slate-400">Last Sent</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(data.last_sent_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    )}
                  </div>

                  {activeDays.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-3xs font-bold uppercase text-slate-400">Active Days</p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeDays.map((day: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-2xs font-bold uppercase border border-emerald-100 dark:border-emerald-500/30"
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
                  <h4 className="text-2xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    Medical Purpose
                  </h4>
                  <ul className="space-y-2.5">
                    {purposeList.map((item: string, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed"
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/15 rounded-full text-emerald-600 dark:text-emerald-400">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-3xs font-bold uppercase text-slate-400">
                        Started
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {data.start_date
                          ? new Date(data.start_date).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/15 rounded-full text-emerald-600 dark:text-emerald-400">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-3xs font-bold uppercase text-slate-400">
                        Duration
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {data.end_date
                          ? new Date(data.end_date).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "Ongoing"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/15 rounded-full text-emerald-600 dark:text-emerald-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-3xs font-bold uppercase text-slate-400">
                        Added
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                        {data.created_at
                          ? new Date(data.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px] text-center bg-white dark:bg-slate-800">
            {isLoading ? (
              <MedicationSkeleton />
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 mx-auto border border-slate-100 dark:border-slate-800">
                  <Ban className="h-8 w-8" />
                </div>
                <p className="text-slate-500 text-sm font-medium">
                  Record not found or unavailable.
                </p>
                <Button variant="ghost" onClick={close} className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15">
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
  <div className="space-y-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/30 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/15 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/30/50">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-900">
        {title}
      </h3>
    </div>
    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line px-1">
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