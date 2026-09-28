import { getBrowserClient } from "@/lib/db/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// AF-01 — Family Care Circle admin surface. Reads go through the admin RPC /
// direct table selects (RLS grants admins full SELECT); the only mutation here
// is the premium dependent-limit override. retry:false so the pre-migration
// "relation does not exist" state renders the graceful empty/error card.

export type DependentStatus = "invited" | "active" | "paused" | "revoked";

export interface FamilyLinkRow {
  id: string;
  caregiver_user_id: string;
  dependent_user_id: string | null;
  display_name: string;
  relationship: string;
  status: DependentStatus;
  is_profile_only: boolean;
  created_at: string;
  caregiver_dependent_count: number;
  caregiver_limit: number;
  live_scopes: string[];
  [key: string]: any;
}

export interface FamilyKpi {
  active_circles: number;
  total_dependents: number;
  profile_only: number;
  linked_accounts: number;
  live_scopes: number;
  revocation_rate: number;
  caregiver_set_reminders: number;
}

export interface ScopeRow {
  id: string;
  dependent_id: string;
  scope: string;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  dependents?: { display_name?: string; caregiver_user_id?: string };
}

export const useFamilyKpi = () =>
  useQuery({
    queryKey: ["family-kpi"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("get_family_kpi_stats");
      if (error) throw error;
      return data as FamilyKpi;
    },
    retry: false,
  });

export const useFamilyLinks = (limit = 200) =>
  useQuery({
    queryKey: ["family-links", limit],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase.rpc("admin_list_family_links", {
        p_limit: limit,
      });
      if (error) throw error;
      return (data as { links: FamilyLinkRow[] })?.links ?? [];
    },
    retry: false,
  });

export const useConsentScopes = () =>
  useQuery({
    queryKey: ["family-consent-scopes"],
    queryFn: async () => {
      const supabase = await getBrowserClient();
      const { data, error } = await supabase
        .from("dependent_share_scopes")
        .select("id, dependent_id, scope, granted_by, granted_at, revoked_at, dependents(display_name, caregiver_user_id)")
        .order("granted_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as ScopeRow[];
    },
    retry: false,
  });

export const useSetFamilyOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      caregiver,
      maxDependents,
      note,
    }: {
      caregiver: string;
      maxDependents: number;
      note?: string | null;
    }) => {
      const supabase = await getBrowserClient();
      const { error } = await supabase.rpc("admin_set_family_override", {
        p_caregiver: caregiver,
        p_max_dependents: maxDependents,
        p_note: note ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["family-links"] });
      qc.invalidateQueries({ queryKey: ["family-kpi"] });
      toast.success("Dependent limit override saved.");
    },
    onError: (e) => toast.error("Override failed: " + (e as Error).message),
  });
};
