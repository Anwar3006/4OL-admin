import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AiModel {
  id: string;
  name: string;
  model_key: string;
  description: string | null;
  model_type: string;
  version: string;
  accuracy_latest: number | null;
  accuracy_target: number;
  latency_p50_ms: number | null;
  status: "active" | "beta" | "staging" | "paused";
  last_trained_at: string | null;
  deployed_by: string | null;
  created_at: string;
  updated_at: string;
}

const MODELS_KEY = ["ai-models"];

// The ai_models registry is RLS-enabled with no policies, so all access goes
// through the service-role server routes (Gap Analysis Part O).
export const useAiModels = () => {
  return useQuery({
    queryKey: MODELS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/ai/models", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load models.");
      return (json.models ?? []) as AiModel[];
    },
  });
};

export const useDeployAiModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      modelKey: string;
      description?: string;
      modelType: string;
      version: string;
      accuracyTarget: number;
      status: string;
    }) => {
      const res = await fetch("/api/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to deploy model.");
      return json.model as AiModel;
    },
    onSuccess: () => {
      toast.success("Model deployed.");
      void queryClient.invalidateQueries({ queryKey: MODELS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["ai-hub-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useUpdateAiModel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/ai/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to update model.");
      return json.model as AiModel;
    },
    onSuccess: (model) => {
      toast.success(
        model.status === "paused" ? `${model.name} paused.` : `${model.name} updated.`,
      );
      void queryClient.invalidateQueries({ queryKey: MODELS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["ai-hub-overview"] });
    },
    onError: (error) => toast.error(error.message),
  });
};
