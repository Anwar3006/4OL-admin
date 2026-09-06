/**
 * Reports menu — TanStack Query hooks (mirrors the plain-fetch hook idiom
 * used by useAdminDashboard / useUser).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type ReportSectionKey =
  | "users"
  | "traction"
  | "admin_activity"
  | "security"
  | "finance"
  | "ai"
  | "marketing";

export interface ReportMeta {
  sections: ReportSectionKey[];
  cadences: string[];
  aiConfigured: boolean;
  aiModel: string | null;
  canManage: boolean;
}

export interface ReportDefinition {
  id: string;
  name: string;
  cadence: string;
  sections: ReportSectionKey[];
  timezone: string;
  delivery_hour: number;
  ai_narrative: boolean;
  enabled: boolean;
  next_run_at: string | null;
  created_at: string;
}

export interface ReportRecipient {
  id: string;
  definition_id: string;
  admin_id: string;
  channels: string[];
  redacted_sections: ReportSectionKey[];
  admin_email?: string | null;
}

export interface ReportRun {
  id: string;
  definition_id: string;
  definitionName?: string;
  cadence: string;
  period_start: string;
  period_end: string;
  status: string;
  metrics: Record<string, SectionResult> | null;
  anomalies: string[];
  awaiting: string[];
  narrative_md: string | null;
  narrative_model: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SectionResult {
  section: ReportSectionKey;
  status: "live" | "awaiting";
  note?: string;
  metrics: Record<string, { current: number | null; previous: number | null }>;
  anomalies: string[];
}

export interface AdminOption {
  id: string;
  email: string | null;
  role: string;
}

const json = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
};

export const useReportMeta = () =>
  useQuery<ReportMeta>({
    queryKey: ["reports-meta"],
    queryFn: () => fetch("/api/reports?view=meta", { cache: "no-store" }).then((r) => json(r)),
  });

export const useReportDefinitions = (enabled: boolean) =>
  useQuery<{ definitions: ReportDefinition[] }>({
    queryKey: ["report-definitions"],
    enabled,
    queryFn: () => fetch("/api/reports?view=definitions", { cache: "no-store" }).then((r) => json(r)),
  });

export const useReportRecipients = (definitionId: string | null) =>
  useQuery<{ recipients: ReportRecipient[] }>({
    queryKey: ["report-recipients", definitionId],
    enabled: Boolean(definitionId),
    queryFn: () =>
      fetch(`/api/reports?view=recipients&definitionId=${definitionId}`, { cache: "no-store" }).then((r) => json(r)),
  });

export const useReportAdmins = (enabled: boolean) =>
  useQuery<{ admins: AdminOption[] }>({
    queryKey: ["report-admins"],
    enabled,
    queryFn: () => fetch("/api/reports?view=admins", { cache: "no-store" }).then((r) => json(r)),
  });

export const useReportInbox = () =>
  useQuery<{ runs: ReportRun[]; canManage: boolean }>({
    queryKey: ["report-inbox"],
    queryFn: () => fetch("/api/reports?view=inbox", { cache: "no-store" }).then((r) => json(r)),
  });

export const useReportRuns = (definitionId: string | null, enabled: boolean) =>
  useQuery<{ runs: ReportRun[] }>({
    queryKey: ["report-runs", definitionId ?? "all"],
    enabled,
    queryFn: () =>
      fetch(`/api/reports?view=runs${definitionId ? `&definitionId=${definitionId}` : ""}`, { cache: "no-store" }).then((r) => json(r)),
  });

// ------------------------------------------------------------ mutations ---

export function useReportsMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["report-definitions"] });
    queryClient.invalidateQueries({ queryKey: ["report-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["report-runs"] });
    queryClient.invalidateQueries({ queryKey: ["report-recipients"] });
  };

  const post = async (body: Record<string, unknown>) =>
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ ok: true; status?: string; runId?: string }>(r));

  return {
    saveDefinition: useMutation({
      mutationFn: (input: {
        definitionId?: string;
        definition: Partial<{
          name: string;
          cadence: string;
          sections: ReportSectionKey[];
          timezone: string;
          deliveryHour: number;
          aiNarrative: boolean;
          enabled: boolean;
        }>;
      }) =>
        post(
          input.definitionId
            ? { action: "update_definition", definitionId: input.definitionId, definition: input.definition }
            : { action: "create_definition", definition: input.definition },
        ),
      onSuccess: invalidate,
    }),
    deleteDefinition: useMutation({
      mutationFn: (definitionId: string) => post({ action: "delete_definition", definitionId }),
      onSuccess: invalidate,
    }),
    setRecipients: useMutation({
      mutationFn: (input: {
        definitionId: string;
        recipients: Array<{ adminId: string; channels: string[]; redactedSections: ReportSectionKey[] }>;
      }) => post({ action: "set_recipients", ...input }),
      onSuccess: invalidate,
    }),
    generateNow: useMutation({
      mutationFn: (definitionId: string) => post({ action: "generate_now", definitionId }),
      onSuccess: invalidate,
    }),
    processQueue: useMutation({
      mutationFn: () => post({ action: "process_queue" }),
      onSuccess: invalidate,
    }),
    retryRun: useMutation({
      mutationFn: (runId: string) => post({ action: "retry_run", runId }),
      onSuccess: invalidate,
    }),
  };
}
