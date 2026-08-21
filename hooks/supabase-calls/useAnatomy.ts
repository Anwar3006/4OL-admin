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
