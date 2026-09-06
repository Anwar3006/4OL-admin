export type Metrics = {
  period: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  byModel: Record<
    string,
    { requests: number; tokens: number; avgLatency: number }
  >;
};

export type Analytics = {
  period: string;
  usage: {
    requests: number;
    uniqueUsers: number;
    errors: number;
    tokens: number;
    avgLatency: number;
  };
  moderation: {
    flags: number;
    aiDetected: number;
    pending: number;
    avgConfidence: number;
  };
};

export type ModerationItem = {
  id: string;
  content_type: string;
  content_id: string;
  report_reason: string;
  report_detail: string | null;
  ai_detected: boolean | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  status: string;
  action_taken: string | null;
  created_at: string;
};

export const TAB_IDS = ["models", "moderation", "recommendations", "analytics"] as const;
export type TabId = (typeof TAB_IDS)[number];

export const TYPE_LABEL: Record<string, string> = {
  classification: "Classification",
  nlp: "NLP",
  medical_nlp: "Medical NLP",
  recommendation: "Recommendation",
  anomaly_detection: "Anomaly Detect",
  generative_ai: "Generative AI",
  translation: "Translation",
  regression: "Regression",
};

// O5: moderation_status enum → human display labels.
export const STATUS_LABEL: Record<string, string> = {
  pending_review: "Pending",
  approved: "Approved",
  rejected: "Dismissed",
  flagged: "Flagged",
  escalated: "Escalated",
  auto_moderated: "Auto-moderated",
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// O-D3: risk derived from ai_confidence (>=90 high, >=70 medium, else low).
export function deriveRisk(item: ModerationItem): "high" | "medium" | "low" {
  const confidence = Number(item.ai_confidence ?? 0);
  if (confidence >= 90) return "high";
  if (confidence >= 70) return "medium";
  return "low";
}
