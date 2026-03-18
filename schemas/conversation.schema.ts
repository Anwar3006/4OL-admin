import { z } from "zod";

export const conversationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["direct", "group"]),
  name: z.string().nullable(),
  description: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_by: z.string().nullable(),
  is_deleted: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  last_message_at: z.string().nullable(),
  last_message_preview: z.string().nullable(),
  last_message_sender: z.string().uuid().nullable(),
  member_count: z.number().optional(),
  user_profiles: z
    .object({
      first_name: z.string().nullable(),
      last_name: z.string().nullable(),
      phone_number: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export type TConversationOutput = z.infer<typeof conversationSchema>;

export const assignAdminSchema = z.object({
  conversation_id: z.string(),
  user_id: z.string(),
  role: z.enum(["super_admin", "admin", "group_leader"]),
});

export type TAssignAdminInput = z.infer<typeof assignAdminSchema>;
