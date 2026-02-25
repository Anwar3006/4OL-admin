import z from "zod";

const statuses = ["pending", "active", "inactive", "rejected"] as const;

export const queryPaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(statuses).optional(),
  admin: z.coerce.boolean().default(false).optional(),
});
