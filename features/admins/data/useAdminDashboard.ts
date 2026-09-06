import { useQuery } from "@tanstack/react-query";

export interface AdminDashboardMetrics {
  time_filter: string;
  admins: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    banned: number;
    pending: number;
    mfa_not_set: number;
    online_now: number;
    by_role: Record<string, number>;
  };
  activity: {
    total_actions: number;
    critical_events: number;
    high_risk_actions: number;
    most_active_admin: string | null;
    peak_hour: number | null;
    recent: Array<{
      id: string;
      actor_name: string | null;
      action_type: string;
      target_table: string;
      record_id: string | null;
      severity: "info" | "warning" | "critical";
      created_at: string;
    }>;
  };
}

export const useAdminDashboardMetrics = (period: "24h" | "7d" | "30d" | "90d" = "30d") => {
  return useQuery<AdminDashboardMetrics, Error>({
    queryKey: ["admin-dashboard-metrics", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/dashboard-metrics?period=${period}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load admin dashboard metrics.");
      return res.json();
    },
  });
};
