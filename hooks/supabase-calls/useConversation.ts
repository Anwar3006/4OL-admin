import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { TConversationOutput } from "@/schemas/conversation.schema";
import { toast } from "sonner";
import { assignAdminWithRulesAction } from "@/actions/conversation.actions";

export const CONVERSATION_QUERY_KEYS = {
  all: ["conversations"] as const,
  lists: () => [...CONVERSATION_QUERY_KEYS.all, "list"] as const,
  list: (page: number, limit: number) =>
    [...CONVERSATION_QUERY_KEYS.lists(), { page, limit }] as const,
  details: () => [...CONVERSATION_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CONVERSATION_QUERY_KEYS.details(), id] as const,
};

export const useConversations = ({
  page,
  limit,
}: {
  page: number;
  limit: number;
}) => {
  return useQuery({
    queryKey: CONVERSATION_QUERY_KEYS.list(page, limit),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getSupabaseClient();
      const {
        data: conversations,
        count,
        error,
      } = await supabase
        .from("conversations")
        .select(
          `
          *,
          user_profiles:created_by (
            first_name,
            last_name,
            phone_number
          ),
          conversation_members (count),
          facility_conversations (facility_id)
          `,
          { count: "exact" },
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      return {
        conversations: (conversations || []).map((c: any) => ({
          ...c,
          member_count: c.conversation_members?.[0]?.count ?? 0,
          facility_id: c.facility_conversations?.[0]?.facility_id || null,
        })) as TConversationOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
  });
};

export const useAssignAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversation_id,
      user_id,
      facility_id,
      role,
    }: {
      conversation_id: string;
      user_id: string;
      facility_id: string;
      role: string;
    }) => {
      // Single atomic RPC — updates conversations, inserts the system message,
      // and assigns the admin in conversation_members, all in one Postgres
      // transaction via the server action.
      const { error } = await assignAdminWithRulesAction(
        conversation_id,
        user_id,
        facility_id,
        role,
      );
      if (error) throw new Error(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.all });
      toast.success("Admin assigned successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to assign admin: ${error.message}`);
    },
  });
};

export const useMakeGroupLeader = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversation_id,
      user_id,
    }: {
      conversation_id: string;
      user_id: string;
    }) => {
      // Call the RPC
      const supabase = await getSupabaseClient();
      const { error } = await supabase.rpc("fn_make_group_leader", {
        p_conversation_id: conversation_id,
        p_user_id: user_id,
        p_facility_id: conversation_id, // As per original hook logic
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User promoted to Group Leader successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to promote: ${error.message}`);
    },
  });
};
