import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { TConversationOutput } from "@/schemas/conversation.schema";
import { toast } from "sonner";

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
          conversation_members (count)
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
      role,
    }: {
      conversation_id: string;
      user_id: string;
      role: string;
    }) => {
      

      // Update last_message_at to ensure it shows up in conversation list
      await supabase
        .from("conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_preview: "System: Rules of Conduct updated"
        })
        .eq("id", conversation_id);

      // Insert Rules of Conduct as a system message
      await supabase.from("messages").insert({
        conversation_id,
        sender_id: user_id, // The assigned admin/leader
        content: "RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to health.\n4. Protect your privacy and others'.",
        message_type: "system",
      });
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
      // 1. Check for existing group leader
      const { data: existingLeader, error: checkError } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversation_id)
        .eq("role", "group_leader")
        .is("left_at", null)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is "No rows found"
        throw new Error(checkError.message);
      }

      if (existingLeader) {
        throw new Error("This facility already has a group leader.");
      }

      // 2. Add as group leader in conversation
      const { error: memberError } = await supabase
        .from("conversation_members")
        .upsert(
          {
            conversation_id,
            user_id,
            role: "group_leader",
            left_at: null,
            joined_at: new Date().toISOString(),
          },
          { onConflict: "conversation_id,user_id" },
        );

      if (memberError) throw new Error(memberError.message);

      // 3. Update last_message_at to ensure it shows up in conversation list
      const { error: convError } = await supabase
        .from("conversations")
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_preview: "System: Rules of Conduct updated"
        })
        .eq("id", conversation_id);

      if (convError) throw new Error(convError.message);

      // 3b. Insert Rules of Conduct as a system message
      await supabase.from("messages").insert({
        conversation_id,
        sender_id: user_id,
        content: "RULES OF CONDUCT:\n1. Be respectful to all members.\n2. No spam or self-promotion.\n3. Keep discussions relevant to health.\n4. Protect your privacy and others'.",
        message_type: "system",
      });

      // 4. Update user profile role
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ role: "group_leader" })
        .eq("user_id", user_id);

      if (profileError) throw new Error(profileError.message);
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
