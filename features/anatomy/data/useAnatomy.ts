import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBrowserClient } from "@/lib/db/browser";
import { toast } from "sonner";

import type {
  AiMappingRow,
  AnatomyBodyPart,
  AnatomyConditionRow,
  AnatomyDrugLinkRow,
  AnatomyExerciseLinkRow,
  AnatomyHotspot,
  AnatomyLinkPage,
  AnatomyOverviewStats,
  AnatomyPremiumConfigResponse,
  AnatomyPremiumLayers,
  AnatomyRegion3D,
  AnatomySymptomRow,
  AnatomyTipRow,
  Hotspot3D,
} from "@/features/anatomy/schema/types";

// Re-exported so existing imports of these types from the hook module
// keep working. New code should import from the schema module directly.
export type {
  AiMappingRow,
  AnatomyBodyPart,
  AnatomyConditionRow,
  AnatomyDrugLinkRow,
  AnatomyExerciseLinkRow,
  AnatomyHotspot,
  AnatomyLinkPage,
  AnatomyOverviewStats,
  AnatomyPremiumConfigResponse,
  AnatomyPremiumLayers,
  AnatomyRegion3D,
  AnatomySymptomRow,
  AnatomyTipRow,
  Hotspot3D,
};


// Hooks for the Human Anatomy page (Gap Analysis Part A).
// Overview + body-map go through the RBAC-enforced API routes; the junction
// views (conditions/symptoms/tips) read directly via the authenticated
// client like the existing content hooks.

export const useAnatomyOverview = () => {
  return useQuery({
    queryKey: ["anatomy-overview"],
    queryFn: async () => {
      const res = await fetch("/api/anatomy/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load anatomy overview.");
      return json as { stats: AnatomyOverviewStats; source: string };
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useBodyParts = (bodySystem: string = "all") => {
  return useQuery({
    queryKey: ["anatomy-body-parts", bodySystem],
    queryFn: async () => {
      const res = await fetch(`/api/anatomy/body-map?bodySystem=${bodySystem}&limit=200`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load body parts.");
      return json as { parts: AnatomyBodyPart[]; total: number };
    },
  });
};

export const useAnatomyHotspots = () => {
  return useQuery({
    queryKey: ["anatomy-hotspots"],
    queryFn: async () => {
      const supabase = getBrowserClient();
      const { data, error } = await supabase
        .from("anatomy_hotspots")
        .select("*")
        .limit(500);
      if (error) {
        // Migration not applied yet — treat as empty, don't throw.
        return [] as AnatomyHotspot[];
      }
      return (data ?? []) as unknown as AnatomyHotspot[];
    },
  });
};

// ── Tab 2: Conditions linked to body parts ─────────────────────────────────

export const useAnatomyConditions = ({
  search,
  bodyPartId,
}: {
  search?: string;
  bodyPartId?: string;
}) => {
  return useQuery({
    queryKey: ["anatomy-conditions", search, bodyPartId],
    queryFn: async () => {
      const supabase = getBrowserClient();
      let query = supabase
        .from("condition_body_parts")
        .select(
          "body_part_id, body_parts(id, name), conditions(id, name, icd11_code, severity, specialist, status)",
        )
        .limit(300);

      if (bodyPartId) query = query.eq("body_part_id", bodyPartId);

      const { data, error } = await query;
      if (error) throw error;

      let rows: AnatomyConditionRow[] = (data ?? []).flatMap((link: any) => {
        const conditions = Array.isArray(link.conditions)
          ? link.conditions
          : link.conditions
            ? [link.conditions]
            : [];
        return conditions.map((c: any) => ({
          condition_id: c.id,
          condition_name: c.name,
          icd11_code: c.icd11_code ?? null,
          severity: c.severity ?? null,
          specialist: c.specialist ?? null,
          status: c.status ?? null,
          body_part_id: link.body_part_id,
          body_part_name: link.body_parts?.name ?? "—",
        }));
      });

      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.condition_name.toLowerCase().includes(q) ||
            r.body_part_name.toLowerCase().includes(q),
        );
      }

      return rows;
    },
    placeholderData: (previousData) => previousData,
  });
};

// ── Tab 3: Symptoms linked to body parts ───────────────────────────────────

export const useAnatomySymptoms = ({
  search,
  bodyPartId,
  severity,
}: {
  search?: string;
  bodyPartId?: string;
  severity?: string;
}) => {
  return useQuery({
    queryKey: ["anatomy-symptoms", search, bodyPartId, severity],
    queryFn: async () => {
      const supabase = getBrowserClient();
      let query = supabase
        .from("symptom_body_parts")
        .select(
          "body_part_id, body_parts(id, name), symptoms(id, name, severity, is_systemic)",
        )
        .limit(300);

      if (bodyPartId) query = query.eq("body_part_id", bodyPartId);

      const { data, error } = await query;
      if (error) throw error;

      let rows: AnatomySymptomRow[] = (data ?? []).flatMap((link: any) => {
        const symptoms = Array.isArray(link.symptoms)
          ? link.symptoms
          : link.symptoms
            ? [link.symptoms]
            : [];
        return symptoms.map((s: any) => ({
          symptom_id: s.id,
          symptom_name: s.name,
          severity: s.severity ?? null,
          is_systemic: s.is_systemic ?? null,
          body_part_id: link.body_part_id,
          body_part_name: link.body_parts?.name ?? "—",
        }));
      });

      if (severity) {
        rows = rows.filter((r) => (r.severity || "").toLowerCase() === severity.toLowerCase());
      }
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.symptom_name.toLowerCase().includes(q) ||
            r.body_part_name.toLowerCase().includes(q),
        );
      }

      return rows;
    },
    placeholderData: (previousData) => previousData,
  });
};

// ── Tab 4: Healthy tips linked to body parts ───────────────────────────────

/**
 * healthy_living_body_parts has RLS enabled with no policies, so the browser
 * client cannot read or write it — this goes through the service-role API
 * route like the drug and exercise links do. Returns a flat array (BodyMapTab
 * and HealthyTipsTab both consume it that way).
 */
export const useAnatomyTips = (bodyPartId?: string, search?: string) => {
  return useQuery({
    queryKey: ["anatomy-tips", bodyPartId, search],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (bodyPartId) qs.set("body_part_id", bodyPartId);
      if (search) qs.set("search", search);
      const res = await fetch(`/api/anatomy/tip-links?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load healthy-tip links.");
      return (json.links ?? []) as AnatomyTipRow[];
    },
    placeholderData: (previousData) => previousData,
  });
};

// ── Tab 5: Drugs linked to body parts ─────────────────────────────────────

export const useAnatomyDrugLinks = ({
  search,
  bodyPartId,
}: {
  search?: string;
  bodyPartId?: string;
}) => {
  return useQuery({
    queryKey: ["anatomy-drug-links", search, bodyPartId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (search) qs.set("search", search);
      if (bodyPartId) qs.set("body_part_id", bodyPartId);
      const res = await fetch(`/api/anatomy/drug-links?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load drug links.");
      return json as { links: AnatomyDrugLinkRow[]; total: number };
    },
    placeholderData: (previousData) => previousData,
  });
};

// ── Tab 6: Exercises linked to body parts ─────────────────────────────────
// Junction is fitness_body_parts; its content column is `workout_id` but it
// references fitness_exercises.id.

/**
 * Paged server-side. `total` is an exact count of the whole filtered set, not
 * the page — 4k+ exercise links make a client-side filter unusable.
 * placeholderData keeps the previous page on screen while the next one loads,
 * so paging and typing never blank the table.
 */
export const useAnatomyExerciseLinks = ({
  search,
  bodyPartId,
  page = 1,
  limit = 25,
}: {
  search?: string;
  bodyPartId?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["anatomy-exercise-links", search, bodyPartId, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      if (bodyPartId) qs.set("body_part_id", bodyPartId);
      const res = await fetch(`/api/anatomy/exercise-links?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load exercise links.");
      return json as AnatomyLinkPage<AnatomyExerciseLinkRow>;
    },
    placeholderData: (previousData) => previousData,
  });
};

// ── Mutations ──────────────────────────────────────────────────────────────

export const useCreateBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      parent_id?: string | null;
      body_system?: string;
      gender_scope?: string;
      icon?: string;
      description?: string;
      display_order?: number;
    }) => {
      const res = await fetch("/api/anatomy/body-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create body part.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-body-parts"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Body part added.");
    },
    onError: (error) => toast.error(error.message),
  });
};

/** Gender-aware content rules editor (tab 5) — writes body_parts.gender_scope. */
export const useUpdateBodyPartGenderScope = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      genderScope,
    }: {
      id: string;
      genderScope: "female" | "male" | "shared" | "unspecified";
    }) => {
      const supabase = getBrowserClient();
      const { error } = await supabase
        .from("body_parts")
        .update({ gender_scope: genderScope })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-body-parts"] });
      toast.success("Gender scope updated.");
    },
    onError: (error) => toast.error(error.message),
  });
};

/** Link an existing healthy-living tip to a body part (tab 4). */
export const useLinkTipToBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipId, bodyPartId }: { tipId: string; bodyPartId: string }) => {
      const res = await fetch("/api/anatomy/tip-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tip_id: tipId, body_part_id: bodyPartId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to link tip.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-tips"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Tip linked to body part.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUnlinkTipFromBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipId, bodyPartId }: { tipId: string; bodyPartId: string }) => {
      const qs = new URLSearchParams({
        tip_id: tipId,
        body_part_id: bodyPartId,
      });
      const res = await fetch(`/api/anatomy/tip-links?${qs.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to unlink tip.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-tips"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Tip body-part link removed.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useLinkDrugToBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      drugId,
      bodyPartId,
    }: {
      drugId: string;
      bodyPartId: string;
    }) => {
      const res = await fetch("/api/anatomy/drug-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drug_id: drugId, body_part_id: bodyPartId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to link drug.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-drug-links"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Drug linked to body part.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUnlinkDrugFromBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      drugId,
      bodyPartId,
    }: {
      drugId: string;
      bodyPartId: string;
    }) => {
      const qs = new URLSearchParams({
        drug_id: drugId,
        body_part_id: bodyPartId,
      });
      const res = await fetch(`/api/anatomy/drug-links?${qs.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to unlink drug.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-drug-links"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Drug body-part link removed.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useLinkExerciseToBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workoutId,
      bodyPartId,
    }: {
      workoutId: string;
      bodyPartId: string;
    }) => {
      const res = await fetch("/api/anatomy/exercise-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workout_id: workoutId, body_part_id: bodyPartId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to link exercise.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-exercise-links"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Exercise linked to body part.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUnlinkExerciseFromBodyPart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workoutId,
      bodyPartId,
    }: {
      workoutId: string;
      bodyPartId: string;
    }) => {
      const qs = new URLSearchParams({
        workout_id: workoutId,
        body_part_id: bodyPartId,
      });
      const res = await fetch(`/api/anatomy/exercise-links?${qs.toString()}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to unlink exercise.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-exercise-links"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Exercise body-part link removed.");
    },
    onError: (error) => toast.error(error.message),
  });
};

// ── Part AL: 3D anatomy explorer (mobile) ─────────────────────────────────

export const useAnatomyRegions3D = () => {
  return useQuery({
    queryKey: ["anatomy-regions-3d"],
    queryFn: async () => {
      const res = await fetch("/api/anatomy/regions");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load regions.");
      return json as { regions: AnatomyRegion3D[]; applied: boolean };
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useHotspots3D = (region?: string) => {
  return useQuery({
    queryKey: ["anatomy-hotspots-3d", region ?? "all"],
    queryFn: async () => {
      const res = await fetch(
        `/api/anatomy/hotspots3d${region ? `?region=${region}` : ""}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load 3D pins.");
      return json as { hotspots: Hotspot3D[]; applied: boolean };
    },
  });
};

export const useUpsertHotspot3D = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      body_part_id: string;
      region_key: string;
      gender: "female" | "male" | "shared";
      x: number;
      y: number;
      z: number;
    }) => {
      const res = await fetch("/api/anatomy/hotspots3d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save pin.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-hotspots-3d"] });
      toast.success("3D pin saved.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useDeleteHotspot3D = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/anatomy/hotspots3d?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete pin.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-hotspots-3d"] });
      toast.success("3D pin removed.");
    },
    onError: (error) => toast.error(error.message),
  });
};

// ── Part AL: AI Pin Mapper ─────────────────────────────────────────────────

export const useAiMappings = (status: string, contentType?: string) => {
  return useQuery({
    queryKey: ["anatomy-ai-mappings", status, contentType ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ status });
      if (contentType) params.set("content_type", contentType);
      const res = await fetch(`/api/anatomy/ai-map?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load suggestions.");
      return json as { mappings: AiMappingRow[]; applied: boolean };
    },
  });
};

export const useRunAiMap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      content_type: "condition" | "symptom" | "tip" | "workout" | "drug";
      unmapped_only: boolean;
      batch_size: number;
    }) => {
      const res = await fetch("/api/anatomy/ai-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI mapping failed.");
      return json as {
        scanned: number;
        proposed: number;
        skipped: number;
        model: string;
        estimatedInputTokens?: number;
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-ai-mappings"] });
      toast.success(
        `Scanned ${result.scanned} — ${result.proposed} new suggestions queued.`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useDecideAiMapping = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      ids: string[];
      decision: "approved" | "rejected";
    }) => {
      const res = await fetch("/api/anatomy/ai-map/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-ai-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-drug-links"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Review saved.");
    },
    onError: (error) => toast.error(error.message),
  });
};

// ── Part AM: premium layers configuration (P2–P5) ─────────────────────────

export const useAnatomyPremiumConfig = () => {
  return useQuery({
    queryKey: ["anatomy-premium-config"],
    queryFn: async () => {
      const res = await fetch("/api/anatomy/premium-config");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load premium config.");
      return json as AnatomyPremiumConfigResponse;
    },
  });
};

export const useUpdateAnatomyPremiumConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      layers: AnatomyPremiumLayers;
      premium_regions: string[];
    }) => {
      const res = await fetch("/api/anatomy/premium-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save premium config.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-premium-config"] });
      toast.success("Premium layers saved — mobile picks them up on next load.");
    },
    onError: (error) => toast.error(error.message),
  });
};
