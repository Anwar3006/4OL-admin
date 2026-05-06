import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { TChatInput, TChatOutput } from "@/schemas/chat.schema";
import { toast } from "sonner";

// Query Keys
export const CHAT_QUERY_KEYS = {
  all: ["chats"] as const,
  lists: () => [...CHAT_QUERY_KEYS.all, "list"] as const,
  list: (page: number, limit: number) =>
    [...CHAT_QUERY_KEYS.lists(), { page, limit }] as const,
  details: () => [...CHAT_QUERY_KEYS.all, "detail"] as const,
  detail: (id: number) => [...CHAT_QUERY_KEYS.details(), id] as const,
  stats: () => [...CHAT_QUERY_KEYS.all, "stats"] as const,
};

// Types
interface PaginatedChatsResponse {
  chats: TChatOutput[];
  meta: {
    totalPages: number;
    total: number;
    currentPage: number;
  };
}

interface UseChatsParams {
  page: number;
  limit: number;
}

// ============= QUERY HOOKS =============

/**
 * Fetch paginated Chat Tickets
 */
export const useChats = ({ page, limit }: UseChatsParams) => {
  return useQuery<PaginatedChatsResponse, Error>({
    queryKey: CHAT_QUERY_KEYS.list(page, limit),
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const supabase = await getSupabaseClient();
      const {
        data: chats,
        count,
        error,
      } = await supabase
        .from("chat_support")
        .select(
          `
          *,
          user_profiles:requested_by (
            first_name,
            last_name,
            phone_number
          )
        `,
          { count: "exact" },
        )
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);

      const totalCount = count ?? 0;

      return {
        chats: (chats || []) as TChatOutput[],
        meta: {
          totalPages: Math.ceil(totalCount / limit),
          total: totalCount,
          currentPage: page,
        },
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Fetch Chat stats
 */
export const useChatStats = () => {
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.stats(),
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("chat_support")
        .select("status, is_deleted");

      if (error) throw new Error(error.message);

      return {
        total: data.length,
        open: data.filter((d) => d.status === "Open" && !d.is_deleted).length,
        closed: data.filter((d) => d.status === "Closed" && !d.is_deleted)
          .length,
        deleted: data.filter((d) => d.is_deleted).length,
      };
    },
  });
};

// ============= MUTATION HOOKS =============

/**
 * Update Chat Ticket
 */
export const useUpdateChat = () => {
  const queryClient = useQueryClient();

  return useMutation<TChatOutput, Error, { id: number; data: TChatInput }>({
    mutationFn: async ({ id, data: chatData }) => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("chat_support")
        .update({
          ...chatData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as TChatOutput;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.all });
      toast.success("Ticket updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update ticket: ${error.message}`);
    },
  });
};

/**
 * Delete Chat Ticket (Soft Delete)
 */
export const useDeleteChat = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("chat_support")
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.all });
      toast.success("Ticket deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete ticket: ${error.message}`);
    },
  });
};
