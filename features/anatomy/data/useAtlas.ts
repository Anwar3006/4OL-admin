import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * AF-04 — Human Atlas crosswalk data hooks.
 *
 * Reads go through the RBAC-gated /api/anatomy/atlas-crosswalk route (which
 * fans out to get_atlas_crosswalk_coverage + get_anatomy_atlas_pins + a direct
 * body_part_atlas_map read); writes POST an action to the same route. Shapes
 * mirror the migration RPC JSON returns verbatim.
 */

export type AtlasSex = "male" | "female";
export type AtlasMapStatus = "proposed" | "confirmed" | "rejected";
export type AtlasMapSource = "manual" | "ai" | "heuristic" | "seed";

export interface AtlasCoverageBySex {
  sex: AtlasSex;
  mapped_body_parts: number;
  confirmed_mappings: number;
  proposed_mappings: number;
  resolved_pins: number;
  atlas_concepts: number;
}

export interface AtlasCoverage {
  total_body_parts: number;
  by_sex: AtlasCoverageBySex[];
}

export interface AtlasPin {
  body_part_id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  source: AtlasMapSource;
}

export interface AtlasMappingRow {
  id: string;
  body_part_id: string;
  fma_concept_id: string;
  sex: AtlasSex;
  confidence: number | null;
  source: AtlasMapSource;
  status: AtlasMapStatus;
  body_parts?: { id: string; name: string; body_system: string } | null;
}

export interface AtlasCrosswalkResponse {
  applied: boolean;
  sex: AtlasSex;
  coverage: AtlasCoverage | null;
  pins: AtlasPin[];
  mappings: AtlasMappingRow[];
  errors: { coverage: string | null; pins: string | null; mappings: string | null };
}

const KEY = "anatomy-atlas-crosswalk";

export const useAtlasCrosswalk = (sex: AtlasSex) => {
  return useQuery({
    queryKey: [KEY, sex],
    queryFn: async () => {
      const res = await fetch(`/api/anatomy/atlas-crosswalk?sex=${sex}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load Atlas crosswalk.");
      return json as AtlasCrosswalkResponse;
    },
    staleTime: 1000 * 60,
  });
};

export const useUpsertAtlasMapping = (sex: AtlasSex) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      body_part_id: string;
      fma_concept_id: string;
      sex: AtlasSex;
      confidence?: number | null;
      source?: AtlasMapSource;
      status?: AtlasMapStatus;
    }) => {
      const res = await fetch("/api/anatomy/atlas-crosswalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "map", ...payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save mapping.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success("Atlas mapping saved.");
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useRecomputeAtlasPins = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sex: AtlasSex) => {
      const res = await fetch("/api/anatomy/atlas-crosswalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recompute", sex }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to recompute pins.");
      return json as { ok: boolean; result: { written: number; skipped: number; atlas_version: string } };
    },
    onSuccess: (data, sex) => {
      queryClient.invalidateQueries({ queryKey: [KEY] });
      toast.success(
        `Recomputed ${data.result?.written ?? 0} Atlas pin(s) for ${sex} (${data.result?.skipped ?? 0} skipped).`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
};
