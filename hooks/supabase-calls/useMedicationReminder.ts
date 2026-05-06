import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

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
      const supabase = await getSupabaseClient();
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

export const useMedicationReminder = (reminderId: string) => {
  return useQuery<any, Error>({
    queryKey: ["medication-reminder", reminderId],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
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
      const supabase = await getSupabaseClient();
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
      const supabase = await getSupabaseClient();
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
      const supabase = await getSupabaseClient();
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
