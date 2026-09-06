import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Hooks for the IBP Businesses page (Gap Analysis Part C).
// All reads/writes go through the RBAC-enforced /api/ibp routes.

export interface IbpRow {
  id: string;
  business_name: string;
  business_category: string | null;
  specific_category: string | null;
  city: string | null;
  region: string | null;
  district: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  website: string | null;
  status: string | null;
  is_featured: boolean | null;
  campaign_budget: number | null;
  total_spend: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
  admin_notes: string | null;
  branches?: number | null;
  founded_year?: number | null;
  tin_number?: string | null;
  registration_docs?: Array<{ type?: string; reference?: string }> | null;
  suspended_reason?: string | null;
  suspended_by?: string | null;
  suspended_at?: string | null;
  created_at: string;
}

export interface IbpKpiStats {
  total: number;
  active_published: number;
  pending_verification: number;
  premium: number;
  products_published: number;
  products_pending: number;
  suspended: number;
}

export interface IbpProduct {
  id: string;
  ibp_id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  status: "pending" | "published" | "rejected" | "flagged";
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  business_name?: string;
}

export interface IbpActivityRow {
  id: string;
  ibp_id: string;
  admin_id: string | null;
  admin_name?: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const IBP_QUERY_KEYS = {
  all: ["ibp"] as const,
  list: (params: Record<string, unknown>) => ["ibp", "list", params] as const,
  overview: ["ibp", "overview"] as const,
  products: (status?: string) => ["ibp", "products", status] as const,
  activity: (id: string) => ["ibp", "activity", id] as const,
};

export const useIbpOverview = () => {
  return useQuery({
    queryKey: IBP_QUERY_KEYS.overview,
    queryFn: async () => {
      const res = await fetch("/api/ibp/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load IBP stats.");
      return json as { stats: IbpKpiStats; source: string };
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useIbps = (params: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const { status, search, limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: IBP_QUERY_KEYS.list({ status, search, limit, offset }),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (status) qs.set("status", status);
      if (search) qs.set("search", search);
      const res = await fetch(`/api/ibp?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load IBPs.");
      return json as { businesses: IbpRow[]; total: number };
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useIbpProducts = (status?: string) => {
  return useQuery({
    queryKey: IBP_QUERY_KEYS.products(status),
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "200" });
      if (status) qs.set("status", status);
      const res = await fetch(`/api/ibp/products?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load IBP products.");
      return json as { products: IbpProduct[]; total: number };
    },
  });
};

export const useIbpActivity = (ibpId: string | null) => {
  return useQuery({
    queryKey: IBP_QUERY_KEYS.activity(ibpId ?? "none"),
    queryFn: async () => {
      const res = await fetch(`/api/ibp/${ibpId}/activity`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load activity.");
      return json as { activity: IbpActivityRow[] };
    },
    enabled: Boolean(ibpId),
  });
};

// ── Mutations ──────────────────────────────────────────────────────────────

export const useRegisterIbp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/ibp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.details?.fieldErrors?.business_category?.[0];
        throw new Error(detail || json.error || "Failed to register IBP.");
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IBP_QUERY_KEYS.all });
      toast.success("IBP business registered.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useIbpAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "verify" | "reject" | "suspend" | "reinstate";
      reason?: string;
    }) => {
      const res = await fetch(`/api/ibp/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IBP_QUERY_KEYS.all });
      toast.success("IBP updated.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useRemoveIbp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ibp/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Removal failed.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IBP_QUERY_KEYS.all });
      toast.success("IBP removed permanently.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useReviewProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const res = await fetch("/api/ibp/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ibp", "products"] });
      queryClient.invalidateQueries({ queryKey: IBP_QUERY_KEYS.overview });
      toast.success("Product reviewed.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useBulkReviewProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      action,
      reason,
    }: {
      ids: string[];
      action: "approve" | "reject";
      reason?: string;
    }) => {
      const res = await fetch("/api/ibp/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Bulk review failed.");
      return json as { updated: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ibp", "products"] });
      queryClient.invalidateQueries({ queryKey: IBP_QUERY_KEYS.overview });
      toast.success(`${data.updated} products reviewed.`);
    },
    onError: (error) => toast.error(error.message),
  });
};
