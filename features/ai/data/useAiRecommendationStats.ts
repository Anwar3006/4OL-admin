import { useQuery } from "@tanstack/react-query";

export interface AiRecommendationStats {
  generatedToday: number;
  ctr: number;
  itemsServed: number;
  conversions: number;
  satisfaction: number | null;
}

export interface AiRecommendationCategory {
  type: string;
  served: number;
  share: number;
  barPct: number;
}

export interface AiRecommendationSegment {
  statDate: string;
  userSegment: string;
  recommendationType: string;
  itemsServed: number;
  ctr: number;
  conversions: number;
  satisfaction: number | null;
  modelVersion: string;
}

export interface AiRecommendationsResponse {
  configured: boolean;
  stats: AiRecommendationStats;
  categories: AiRecommendationCategory[];
  segments: AiRecommendationSegment[];
}

// Reads ai_recommendation_stats via the server route (O-D4): `configured`
// stays false until the pipeline or a manual import writes rows.
export const useAiRecommendationStats = () => {
  return useQuery<AiRecommendationsResponse>({
    queryKey: ["ai-recommendation-stats"],
    queryFn: async () => {
      const res = await fetch("/api/ai/recommendations", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Failed to load recommendation stats.");
      }
      return json as AiRecommendationsResponse;
    },
  });
};

export interface AiHubOverview {
  configured: boolean;
  activeModels: number;
  pendingFlags: number;
  avgAccuracy: number | null;
  queriesToday: number;
}

export const useAiHubOverview = () => {
  return useQuery<AiHubOverview>({
    queryKey: ["ai-hub-overview"],
    queryFn: async () => {
      const res = await fetch("/api/ai/overview", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load AI overview.");
      return json as AiHubOverview;
    },
    staleTime: 60 * 1000,
  });
};
