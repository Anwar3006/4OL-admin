import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { NormalizedDrugRow } from "@/features/medication-reminder/data/drug-import-mapping";

// Powers the Medication Reminder → Drug Database / Interactions / AI Checker
// tabs (Gap Analysis Part B). Reads go through the RBAC-enforced admin API
// routes; KPI RPCs run client-side against Supabase like the existing
// medication hooks.

export interface DrugRow {
  id: string;
  name: string;
  generic_name: string | null;
  slug: string;
  category: string | null;
  availability: "otc" | "rx_only" | "controlled" | "unknown";
  dosage_form: string | null;
  strength: string | null;
  strength_unit: string | null;
  pack_size: number | null;
  manufacturer: string | null;
  active_ingredients: string[];
  conditions_treated: string[];
  atc_code: string | null;
  status: "active" | "discontinued" | "under_review" | "unverified";
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DrugListParams {
  search?: string;
  category?: string;
  status?: string;
  availability?: string;
  limit?: number;
  offset?: number;
}

export const useDrugs = (params: DrugListParams) => {
  return useQuery({
    queryKey: ["drugs", params],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.search) qs.set("search", params.search);
      if (params.category) qs.set("category", params.category);
      if (params.status) qs.set("status", params.status);
      if (params.availability) qs.set("availability", params.availability);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));

      const res = await fetch(`/api/medication/drugs?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load drugs.");
      return json as { drugs: DrugRow[]; total: number; limit: number; offset: number };
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useDrugKpiStats = () => {
  return useQuery({
    queryKey: ["drug-kpi-stats"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_drug_kpi_stats");
      if (error) throw error;
      // RETURNS TABLE(...) — PostgREST returns a one-element array, so the
      // row has to be unwrapped before it matches this shape. See
      // HealthyLivingStats for the crash this caused when it wasn't.
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as {
        drugs_in_db: number;
        drug_categories: number;
        interaction_pairs: number;
        interaction_flags_30d: number;
        pending_verifications: number;
      } | null;
    },
  });
};

export const useDrugAdherenceStats = () => {
  return useQuery({
    queryKey: ["drug-adherence-stats"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.rpc("get_drug_adherence_stats");
      if (error) throw error;
      return data as {
        drug_name: string;
        drug_id: string | null;
        active_reminders: number;
        adherence_rate: number;
        missed_30d: number;
        avg_doses_per_day: number;
      }[];
    },
  });
};

// ── Interactions ───────────────────────────────────────────────────────────

export interface InteractionRow {
  id: string;
  severity: "critical" | "major" | "moderate" | "minor";
  effect: string | null;
  recommended_action: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  drug_a: { id: string; name: string; generic_name: string | null } | null;
  drug_b: { id: string; name: string; generic_name: string | null } | null;
  flags_30d?: number;
}

export const useDrugInteractions = ({
  search,
  severity,
  limit = 50,
  offset = 0,
}: {
  search?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ["drug-interactions", { search, severity, limit, offset }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (severity) qs.set("severity", severity);
      qs.set("limit", String(limit));
      qs.set("offset", String(offset));

      const res = await fetch(`/api/medication/interactions?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load interactions.");
      return json as { interactions: InteractionRow[]; total: number };
    },
    placeholderData: (previousData) => previousData,
  });
};

// ── Verification queue ─────────────────────────────────────────────────────

export interface VerificationRequest {
  id: string;
  entered_name: string;
  status: "pending" | "auto_matched" | "verified" | "rejected";
  auto_check_result: Record<string, unknown>;
  created_at: string;
  reviewed_at: string | null;
  matched_drug: { id: string; name: string; generic_name: string | null } | null;
}

export const useVerificationQueue = (status?: string) => {
  return useQuery({
    queryKey: ["drug-verification-queue", status],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: "50" });
      if (status) qs.set("status", status);
      const res = await fetch(`/api/medication/verification?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load verification queue.");
      return json as { requests: VerificationRequest[]; total: number };
    },
  });
};

// ── Mutations ──────────────────────────────────────────────────────────────

export const useCreateDrug = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/medication/drugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create drug.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      queryClient.invalidateQueries({ queryKey: ["drug-kpi-stats"] });
      toast.success("Drug added to the catalog.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUpdateDrug = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const res = await fetch(`/api/medication/drugs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update drug.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      toast.success("Drug updated.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useDeleteDrug = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/medication/drugs/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete drug.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      queryClient.invalidateQueries({ queryKey: ["drug-kpi-stats"] });
      toast.success("Drug removed from the catalog.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useCreateInteraction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      drug_a_id: string;
      drug_b_id: string;
      severity: string;
      effect?: string;
      recommended_action?: string;
    }) => {
      const res = await fetch("/api/medication/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create interaction.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug-interactions"] });
      queryClient.invalidateQueries({ queryKey: ["drug-kpi-stats"] });
      toast.success("Interaction pair recorded.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export interface ImportChunkResult {
  batchId: string;
  inserted: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: { row: string; error: string }[];
}

/** Sends normalized rows to the import route in ≤ 500-row chunks. */
export const useImportDrugs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fileName,
      rows,
      skipped,
      totalInFile,
      chunkSize = 500,
    }: {
      fileName: string;
      rows: NormalizedDrugRow[];
      skipped: number;
      totalInFile: number;
      chunkSize?: number;
    }) => {
      const totals = { inserted: 0, updated: 0, failed: 0 };
      const errors: { row: string; error: string }[] = [];

      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const res = await fetch("/api/medication/drugs/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, rows: chunk, skipped, totalInFile }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Import chunk ${i / chunkSize + 1} failed.`);
        totals.inserted += json.inserted ?? 0;
        totals.updated += json.updated ?? 0;
        totals.failed += json.failed ?? 0;
        if (Array.isArray(json.errors)) errors.push(...json.errors);
      }

      return { ...totals, errors: errors.slice(0, 20) };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      queryClient.invalidateQueries({ queryKey: ["drug-kpi-stats"] });
      toast.success(
        `Import complete: ${result.inserted} inserted, ${result.failed} failed.`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useVerificationAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/medication/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verification action failed.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drug-verification-queue"] });
      queryClient.invalidateQueries({ queryKey: ["drugs"] });
      queryClient.invalidateQueries({ queryKey: ["drug-kpi-stats"] });
      toast.success("Verification request processed.");
    },
    onError: (error) => toast.error(error.message),
  });
};
