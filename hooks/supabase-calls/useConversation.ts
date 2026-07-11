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
  adminGroups: () => [...CONVERSATION_QUERY_KEYS.all, "admin-groups"] as const,
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

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("conversations")
        .update({ is_deleted: true })
        .eq("id", conversationId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.all });
      toast.success("Conversation deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete conversation: ${error.message}`);
    },
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      group_category?: string;
      is_verified_only?: boolean;
      max_members?: number;
    }) => {
      const supabase = await getSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          is_group: true,
          name: params.name,
          description: params.description || null,
          group_name: params.name,
          group_description: params.description || null,
          group_category: params.group_category || null,
          is_verified_only: params.is_verified_only ?? false,
          max_members: params.max_members ?? 500,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw new Error(convError.message);

      // The creating admin becomes the group's owner so it isn't orphaned
      // with zero members.
      const { error: memberError } = await supabase
        .from("conversation_members")
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw new Error(memberError.message);

      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.all });
      toast.success("Group created successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to create group: ${error.message}`);
    },
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
    }: {
      id: string;
      name?: string;
      description?: string;
    }) => {
      const supabase = await getSupabaseClient();
      const payload: Record<string, any> = {};
      if (name !== undefined) payload.name = name;
      if (description !== undefined) payload.description = description;
      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("conversations")
        .update(payload)
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATION_QUERY_KEYS.all });
      toast.success("Group updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update group: ${error.message}`);
    },
  });
};

/**
 * useAdminConversations — fetches group-type conversations with:
 *   - member count via conversation_members aggregate
 *   - last message preview and sender info via messages
 *   - creator name via user_profiles
 * Only returns conversations where type = 'group' and is_deleted = false.
 */
export const useAdminConversations = ({
  page,
  limit,
  search,
  status,
}: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: [
      ...CONVERSATION_QUERY_KEYS.adminGroups(),
      { page, limit, search, status },
    ],
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getSupabaseClient();

      let query = supabase
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
          messages (
            content,
            created_at,
            sender_id,
            sender:user_profiles!sender_id (
              first_name,
              last_name
            )
          )
          `,
          { count: "exact" },
        )
        .eq("type", "group")
        .eq("is_deleted", false);

      if (search) {
        query = query.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`,
        );
      }

      if (status && status !== "All Status") {
        query = query.eq("status", status.toLowerCase());
      }

      const {
        data: conversations,
        count,
        error,
      } = await query.order("created_at", { ascending: false }).range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      return {
        conversations: (conversations || []).map((c: any) => {
          // Get last message from sorted messages
          const messages = c.messages || [];
          const lastMsg =
            messages.length > 0
              ? messages.reduce((a: any, b: any) =>
                  a.created_at > b.created_at ? a : b,
                )
              : null;

          return {
            ...c,
            member_count: c.conversation_members?.[0]?.count ?? 0,
            last_message: lastMsg
              ? {
                  content: lastMsg.content,
                  created_at: lastMsg.created_at,
                  sender: lastMsg.sender,
                }
              : null,
          };
        }),
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
  });
};

export interface ChatTabCounts {
  total_groups: number;
  open_support: number;
  pending_flags: number;
}

export const useChatTabCounts = () => {
  return useQuery({
    queryKey: [...CONVERSATION_QUERY_KEYS.all, "tab-counts"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_chat_tab_counts");

      if (error) throw new Error(error.message);

      return data as ChatTabCounts;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export interface ChatKpiStats {
  total_groups: number;
  groups_delta: number;
  total_members: number;
  members_delta: number;
  unread_support: number;
  support_delta: number;
  avg_response_hrs: number;
  response_delta: number;
}

export const useChatKpiStats = () => {
  return useQuery({
    queryKey: [...CONVERSATION_QUERY_KEYS.all, "kpi-stats"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_chat_kpi_stats");

      if (error) throw new Error(error.message);

      return data as ChatKpiStats;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
};

// =============================================================================
// Flagged Content Moderation Hooks
// =============================================================================

export interface FlaggedContentItem {
  content_type: "message" | "conversation";
  content_id: string;
  content_preview: string;
  content_created_at: string;
  sender_id: string;
  sender_first_name: string | null;
  sender_last_name: string | null;
  conversation_name: string | null;
  conversation_id: string;
  flag_id: string;
  reported_by: string | null;
  reporter_first_name: string | null;
  reporter_last_name: string | null;
  report_reason: string;
  report_detail: string | null;
  ai_detected: boolean | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  moderation_status: string;
  action_taken: string | null;
  action_notes: string | null;
  flagged_at: string;
}

export const useFlaggedContent = () => {
  return useQuery({
    queryKey: [...CONVERSATION_QUERY_KEYS.all, "flagged-content"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_flagged_content");

      if (error) throw new Error(error.message);

      return (data || []) as FlaggedContentItem[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useModerateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      flag_id,
      action,
      action_notes,
    }: {
      flag_id: string;
      action: "dismiss" | "warn" | "remove" | "ban";
      action_notes?: string;
    }) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.rpc("moderate_content", {
        p_flag_id: flag_id,
        p_action: action,
        p_action_notes: action_notes || null,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...CONVERSATION_QUERY_KEYS.all, "flagged-content"],
      });
      toast.success("Content moderated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to moderate: ${error.message}`);
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
