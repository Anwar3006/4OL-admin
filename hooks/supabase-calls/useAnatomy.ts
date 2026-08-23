import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

// Hooks for the Human Anatomy page (Gap Analysis Part A).
// Overview + body-map go through the RBAC-enforced API routes; the junction
// views (conditions/symptoms/tips) read directly via the authenticated
// client like the existing content hooks.

export interface AnatomyOverviewStats {
  body_parts_mapped: number;
  condition_links: number;
  symptom_links: number;
  map_interactions_30d: number;
  healthy_tip_links: number;
  hotspots: number;
}

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

export interface AnatomyBodyPart {
  id: string;
  name: string;
  parent_id: string | null;
  mesh_id: string | null;
  path: string;
  level: number | null;
  body_system: string;
  gender_scope?: string | null;
  icon?: string | null;
  description?: string | null;
  display_order?: number | null;
  symptom_count: number;
  condition_count: number;
}

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

export interface AnatomyHotspot {
  id: string;
  body_part_id: string;
  gender: "female" | "male" | "shared";
  view: "front" | "back";
  body_system: string | null;
  svg_path_id: string | null;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  is_organ: boolean;
}

export const useAnatomyHotspots = () => {
  return useQuery({
    queryKey: ["anatomy-hotspots"],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
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

export interface AnatomyConditionRow {
  condition_id: string;
  condition_name: string;
  icd11_code: string | null;
  severity: string | null;
  specialist: string | null;
  status: string | null;
  body_part_id: string;
  body_part_name: string;
}

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
      const supabase = await getSupabaseClient();
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

export interface AnatomySymptomRow {
  symptom_id: string;
  symptom_name: string;
  severity: string | null;
  is_systemic: boolean | null;
  body_part_id: string;
  body_part_name: string;
}

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
      const supabase = await getSupabaseClient();
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

export interface AnatomyTipRow {
  tip_id: string;
  tip_name: string;
  status: string | null;
  body_part_id: string;
  body_part_name: string;
}

export const useAnatomyTips = (bodyPartId?: string) => {
  return useQuery({
    queryKey: ["anatomy-tips", bodyPartId],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      let query = supabase
        .from("healthy_living_body_parts")
        .select(
          "tip_id, body_part_id, body_parts(id, name), healthy_living_info(id, name, status)",
        )
        .limit(200);
      if (bodyPartId) query = query.eq("body_part_id", bodyPartId);

      const { data, error } = await query;
      if (error) {
        // Junction table appears with the anatomy_extension migration.
        return [] as AnatomyTipRow[];
      }

      return (data ?? []).map((link: any) => ({
        tip_id: link.tip_id,
        tip_name: link.healthy_living_info?.name ?? "—",
        status: link.healthy_living_info?.status ?? null,
        body_part_id: link.body_part_id,
        body_part_name: link.body_parts?.name ?? "—",
      })) as AnatomyTipRow[];
    },
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
      const supabase = await getSupabaseClient();
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
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("healthy_living_body_parts")
        .insert({ tip_id: tipId, body_part_id: bodyPartId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anatomy-tips"] });
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Tip linked to body part.");
    },
    onError: (error) => toast.error(error.message),
  });
};

// ── Part AL: 3D anatomy explorer (mobile) ─────────────────────────────────

export interface AnatomyRegion3D {
  key: string;
  label: string;
  target_x: number;
  target_y: number;
  target_z: number;
  zoom: number;
  default_yaw: number;
  display_order: number;
}

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

export interface Hotspot3D {
  id: string;
  body_part_id: string;
  region_key: string;
  gender: "female" | "male" | "shared";
  x: number;
  y: number;
  z: number;
  source: string;
  body_parts?: { id: string; name: string; body_system: string | null } | null;
}

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

export interface AiMappingRow {
  id: string;
  content_type: "condition" | "symptom" | "tip" | "workout";
  content_id: string;
  content_name: string;
  confidence: number;
  rationale: string | null;
  status: "proposed" | "approved" | "rejected";
  model: string | null;
  created_at: string;
  body_parts?: { id: string; name: string } | null;
}

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
      content_type: "condition" | "symptom" | "tip" | "workout";
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
      queryClient.invalidateQueries({ queryKey: ["anatomy-overview"] });
      toast.success("Review saved.");
    },
    onError: (error) => toast.error(error.message),
  });
};

// ── Part AM: premium layers configuration (P2–P5) ─────────────────────────

export interface AnatomyPremiumLayers {
  organs: boolean;
  tours: boolean;
  quiz: boolean;
  kids: boolean;
}

export interface AnatomyPremiumConfigResponse {
  layers: AnatomyPremiumLayers;
  regions: { key: string; label: string; is_premium: boolean }[];
  applied: boolean;
}

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
