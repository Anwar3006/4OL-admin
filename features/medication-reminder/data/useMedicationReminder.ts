import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

// Senior Approach: `interval` is a bare number whose unit varies per row
// (minutes vs hours) — stored separately in `interval_unit`. This formatter
// is shared between the Logged Reminders table and the View dialog so the
// display logic only lives in one place.
export const formatReminderInterval = (
  interval?: number | null,
  intervalUnit?: string | null,
): string => {
  if (interval === null || interval === undefined) return "—";
  const unit = (intervalUnit || "hours").toLowerCase();
  if (unit.startsWith("min")) return `Every ${interval} min`;
  if (unit.startsWith("hour") || unit === "h") return `Every ${interval}h`;
  if (unit.startsWith("day")) return `Every ${interval} day${interval === 1 ? "" : "s"}`;
  return `Every ${interval} ${unit}`;
};

// `is_enabled` only tells us whether notifications are toggled on. A course
// whose end date is before today is complete even if that flag was never
// switched off. We also retain the same-day last-send check for courses that
// finish today.
export type ReminderStatus = "complete" | "active" | "paused";

const toUtcDateKey = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
};

export const getReminderStatus = (row: {
  last_sent_at?: string | null;
  end_date?: string | null;
  is_enabled?: boolean | null;
}): ReminderStatus => {
  const lastSentKey = toUtcDateKey(row.last_sent_at);
  const endDateKey = toUtcDateKey(row.end_date);
  const todayKey = new Date().toISOString().slice(0, 10);
  const endDateIncludesTime = /\d{2}:\d{2}/.test(row.end_date ?? "");
  const endTime = row.end_date ? new Date(row.end_date).getTime() : NaN;
  const durationHasPassed =
    Boolean(endDateKey && endDateKey < todayKey) ||
    (endDateIncludesTime && !Number.isNaN(endTime) && endTime <= Date.now());

  if (
    endDateKey &&
    (durationHasPassed || (lastSentKey !== null && lastSentKey >= endDateKey))
  ) {
    return "complete";
  }

  return row.is_enabled ? "active" : "paused";
};

type Pagination = {
  limit: number;
  page: number;
  search?: string;
  isEnabled?: boolean;
};

export const useMedicationReminders = ({
  limit,
  page,
  search,
  isEnabled,
}: Pagination) => {
  return useQuery<any, Error>({
    queryKey: ["medication-reminders", { limit, page, search, isEnabled }],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      let query = supabase.from("medication_reminders").select("*");

      const from = (page - 1) * limit;
      const to = limit + from - 1;

      if (search && search.trim() !== "") {
        query = query.or(`medication_name.ilike.%${search}%`);
      }

      if (isEnabled) {
        query = query.eq("is_enabled", isEnabled);
      }

      const [medicationsResult, { count }] = await Promise.all([
        query.order("created_at", { ascending: false }).range(from, to),

        supabase
          .from("medication_reminders")
          .select("id", { count: "exact", head: true }),
      ]);

      if (medicationsResult.error) throw medicationsResult.error;

      const totalCount = count || 0;

      return {
        data: medicationsResult.data,
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
        analytics: "",
      };
    },
  });
};

// Senior Approach: Powers the "Logged Reminders" tab on the Medication
// Reminder admin page — the actual medication reminders created by mobile
// app users, joined against their profile for display. Paginated + searchable
// by drug name.
export interface LoggedReminderRow {
  id: string;
  drug_name: string;
  generic_name?: string | null;
  dosage_amount?: string | null;
  interval?: number | null;
  interval_unit?: "minutes" | "hours" | string | null;
  drug_type?: string | null;
  drug_color?: string | null;
  notification_schedule?: string | null;
  number_of_intakes?: number | null;
  is_enabled: boolean;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
  last_sent_at?: string | null;
  created_at: string | null;
  manufacturer?: string | null;
  strength?: string | null;
  strength_unit?: string | null;
  dosage_form?: string | null;
  conditions_treated?: string[];
  adherence_rate?: number | null;
  adherence_total?: number;
  missed_count?: number;
  skipped_count?: number;
  user_profiles?: {
    user_id?: string;
    public_id?: string | null;
    name: string;
    region?: string | null;
  };
  [key: string]: any;
}

export const useLoggedReminders = ({
  pageIndex,
  pageSize = 10,
  search = "",
}: {
  pageIndex: number;
  pageSize?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: ["logged-reminders-list", pageIndex, pageSize, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pageIndex),
        limit: String(pageSize),
      });
      if (search) params.set("search", search);
      return apiFetch<{ reminders: LoggedReminderRow[]; count: number }>(
        `/api/medication/reminders?${params.toString()}`,
      );
    },
    placeholderData: (previousData) => previousData,
  });
};

// Senior Approach: Powers the "Adherence" tab — reads directly from
// `medication_adherence` (see KPIs.sql), joined to the parent reminder for
// the drug name and to the user for display. Paginated + filterable by
// status (taken / skipped / missed).
export interface AdherenceLogRow {
  id: string;
  reminder_id: string;
  user_id: string;
  status: "taken" | "skipped" | "missed";
  scheduled_time: string;
  action_time?: string | null;
  created_at: string;
  medication_reminders?: {
    id?: string;
    drug_name: string;
  };
  user_profiles?: {
    user_id?: string;
    name: string;
  };
  [key: string]: any;
}

export const useMedicationAdherence = ({
  pageIndex,
  pageSize = 10,
  status,
}: {
  pageIndex: number;
  pageSize?: number;
  status?: "taken" | "skipped" | "missed";
}) => {
  return useQuery({
    queryKey: ["medication-adherence-list", pageIndex, pageSize, status],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const from = (pageIndex - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("medication_adherence")
        .select(
          `
          id,
          reminder_id,
          user_id,
          status,
          scheduled_time,
          action_time,
          created_at,
          medication_reminders (
            id,
            drug_name
          ),
          user_profiles (
            user_id,
            first_name,
            last_name
          )
        `,
          { count: "exact" },
        );

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query
        .order("scheduled_time", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const logs: AdherenceLogRow[] = (data || []).map((item: any) => ({
        ...item,
        medication_reminders: {
          id: item.medication_reminders?.id,
          drug_name: item.medication_reminders?.drug_name || "Unknown Drug",
        },
        user_profiles: {
          user_id: item.user_profiles?.user_id,
          name:
            `${item.user_profiles?.first_name || ""} ${item.user_profiles?.last_name || ""}`.trim() ||
            "Unknown User",
        },
      }));

      return { logs, count: count || 0 };
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useMedicationReminder = (reminderId: string) => {
  return useQuery<any, Error>({
    queryKey: ["medication-reminder", reminderId],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("medication_reminders")
        .select("*")
        .eq("id", reminderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!reminderId,
  });
};

//======================= Mutations

// 1. Hook to Upsert (Create or Update)
export const useUpsertMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      reminderId,
      values,
    }: {
      adminId: string;
      reminderId: string | null;
      values: any;
    }) => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc(
        "admin_upsert_medication_reminder",
        {
          p_user_id: adminId,
          p_reminder_id: reminderId,
          p_payload: values,
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success("Medication reminder saved and logged.");
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });
};

// 2. Hook to Delete
export const useDeleteMedication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      reminderId,
    }: {
      adminId: string;
      reminderId: string;
    }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc("admin_delete_medication_reminder", {
        p_admin_id: adminId,
        p_reminder_id: reminderId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success("Reminder deleted and audit log updated.");
    },
  });
};

//
export const useToggleUserMedicationNotification = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isEnabled,
      userId,
    }: {
      isEnabled: boolean;
      userId: string;
    }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc(
        "toggle_user_medication_notification",
        {
          p_user_id: userId,
          p_is_enabled: isEnabled,
        },
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medication-reminders"] });
      toast.success("User notification preference updated.");
    },
  });
};
