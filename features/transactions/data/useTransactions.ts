/**
 * Transactions hooks — Gap Analysis Part AA.
 * All finance surfaces (Recent, Service Charge %, Subscriptions, Failed,
 * Refunds, Tax & VAT, Expenses) read the unified ledger through the
 * /api/transactions* routes behind RBAC. Row shapes stay snake_case.
 */

import { apiFetch } from "@/lib/api-fetch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionRow {
  id: string;
  reference: string;
  category:
    | "subscription_fee"
    | "service_fee"
    | "product_sale"
    | "marketing_fee"
    | "refund"
    | "payout";
  direction: "in" | "out";
  amount: number;
  currency: string;
  payment_method: string;
  status:
    | "received"
    | "processed"
    | "pending"
    | "failed"
    | "refunded"
    | "disputed"
    | "cancelled";
  failure_reason: string | null;
  attempts: number;
  next_retry_at: string | null;
  payer_class: "user" | "business";
  payer_user_id: string | null;
  payer_business_id: string | null;
  payer_name: string;
  payer_code: string;
  entity_kind: "consumer" | "ibp" | "facility";
  txn_type_detail: string | null;
  plan_key: string | null;
  valid_until: string | null;
  source: string;
  fee_amount: number | null;
  processed_at: string;
}

export interface TransactionsOverview {
  kpis: {
    total_transactions: number | null;
    total_revenue: number | null;
    total_customers: number | null;
    gross_profit: number | null;
    total_transactions_hidden?: boolean;
    total_revenue_hidden?: boolean;
    total_customers_hidden?: boolean;
    gross_profit_hidden?: boolean;
  };
  monthly: Array<{ month: string; revenue: number }> | null;
  payment_methods: Record<string, number> | null;
  service_fees: { total_mtd: number; ytd: number } | null;
  subscriptions: {
    renewals_mtd: number;
    new_mtd: number;
    upgrades_mtd: number;
    churn_pct: number;
  } | null;
  failed: { count: number; amount_at_risk: number };
  tax: Record<string, number> | null;
  expenses: { total: number; by_category: Record<string, number> } | null;
  monthly_hidden?: boolean;
  payment_methods_hidden?: boolean;
  service_fees_hidden?: boolean;
  subscriptions_hidden?: boolean;
  tax_hidden?: boolean;
}

export interface RefundRow {
  id: string;
  transaction_id: string | null;
  amount: number;
  reason: string;
  notes: string | null;
  status: "pending_approval" | "processed" | "rejected";
  created_at: string;
  transactions: {
    reference: string;
    payer_name: string;
    payer_code: string;
    amount: number;
    payment_method: string;
    status: string;
  } | null;
}

export interface ServiceRateRow {
  key: string;
  label: string;
  rate_pct: number;
  basis: string;
  updated_at: string;
}

export interface TaxFilingRow {
  id: string;
  period: string;
  status: "filed" | "in_progress" | "not_started";
  due_date: string | null;
  remitted_amount: number;
  filed_at: string | null;
  notes: string | null;
}

export interface ExpenseRow {
  id: string;
  month: string;
  category: string;
  amount: number;
  note: string | null;
}

export interface VisibilityMetric {
  metric_key: string;
  visible_to_finance: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const TRANSACTION_QUERY_KEYS = {
  all: ["transactions"] as const,
  lists: () => [...TRANSACTION_QUERY_KEYS.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...TRANSACTION_QUERY_KEYS.lists(), params] as const,
  overview: () => [...TRANSACTION_QUERY_KEYS.all, "overview"] as const,
  refunds: () => [...TRANSACTION_QUERY_KEYS.all, "refunds"] as const,
  rates: () => [...TRANSACTION_QUERY_KEYS.all, "rates"] as const,
  tax: () => [...TRANSACTION_QUERY_KEYS.all, "tax"] as const,
  expenses: () => [...TRANSACTION_QUERY_KEYS.all, "expenses"] as const,
  visibility: () => [...TRANSACTION_QUERY_KEYS.all, "visibility"] as const,
};

// ---------------------------------------------------------------------------
// Ledger list
// ---------------------------------------------------------------------------

export type TransactionListParams = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  status?: string;
  segment?: "all" | "user" | "business";
  failedOnly?: boolean;
  pendingOnly?: boolean;
  highValue?: boolean;
  payer?: string;
  from?: string;
  to?: string;
};

export const useTransactions = (params: TransactionListParams = {}) => {
  const resolved = { page: 1, limit: 25, segment: "all", ...params };
  return useQuery<{ rows: TransactionRow[]; total: number }, Error>({
    queryKey: TRANSACTION_QUERY_KEYS.list(resolved),
    queryFn: async () => {
      const qs = new URLSearchParams();
      for (const [key, value] of Object.entries(resolved)) {
        if (value === undefined || value === null || value === "") continue;
        qs.set(key, String(value));
      }
      const result = await apiFetch<{
        ok: boolean;
        rows: TransactionRow[];
        total: number;
      }>(`/api/transactions?${qs.toString()}`);
      return { rows: result.rows, total: result.total };
    },
  });
};

export const useTransactionsOverview = () => {
  return useQuery<
    { empty: boolean; overview: TransactionsOverview | null; hidden_metrics: string[] },
    Error
  >({
    queryKey: TRANSACTION_QUERY_KEYS.overview(),
    queryFn: async () => {
      const result = await apiFetch<{
        ok: boolean;
        empty: boolean;
        overview: TransactionsOverview | null;
        hidden_metrics?: string[];
      }>("/api/transactions/overview");
      return {
        empty: result.empty,
        overview: result.overview,
        hidden_metrics: result.hidden_metrics ?? [],
      };
    },
  });
};

// ---------------------------------------------------------------------------
// Row actions
// ---------------------------------------------------------------------------

export const useTransactionAction = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; action: "retry" | "dispute" | "cancel" }>({
    mutationFn: async ({ id, action }) => {
      await apiFetch<{ ok: boolean }>(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: async (_, { action }) => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      toast.success(
        action === "retry"
          ? "Payment requeued for retry"
          : action === "dispute"
            ? "Charge marked as disputed"
            : "Charge cancelled",
      );
    },
    onError: (error) => toast.error(`Action failed: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

export const useRefunds = (status?: string) => {
  return useQuery<{ refunds: RefundRow[] }, Error>({
    queryKey: [...TRANSACTION_QUERY_KEYS.refunds(), status ?? "all"],
    queryFn: async () => {
      const qs = status ? `?status=${status}` : "";
      return apiFetch<{ ok: boolean; refunds: RefundRow[] }>(`/api/transactions/refunds${qs}`);
    },
  });
};

export const useRequestRefund = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { transactionId: string; amount?: number; reason: string; notes?: string }
  >({
    mutationFn: async ({ transactionId, amount, reason, notes }) => {
      await apiFetch<{ ok: boolean }>(`/api/transactions/${transactionId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason, notes }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      toast.success("Refund filed — awaiting approval");
    },
    onError: (error) => toast.error(`Refund failed: ${error.message}`),
  });
};

export const useFileRefund = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { reference: string; amount?: number; reason: string; notes?: string }
  >({
    mutationFn: async (payload) => {
      await apiFetch<{ ok: boolean }>("/api/transactions/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      toast.success("Refund filed — awaiting approval");
    },
    onError: (error) => toast.error(`Refund failed: ${error.message}`),
  });
};

export const useDecideRefund = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; decision: "approve" | "reject" }>({
    mutationFn: async ({ id, decision }) => {
      await apiFetch<{ ok: boolean }>(`/api/transactions/refunds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
    },
    onSuccess: async (_, { decision }) => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      toast.success(decision === "approve" ? "Refund approved and processed" : "Refund rejected");
    },
    onError: (error) => toast.error(`Refund decision failed: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Service charge rates
// ---------------------------------------------------------------------------

export const useServiceRates = () => {
  return useQuery<{ rates: ServiceRateRow[]; can_edit: boolean }, Error>({
    queryKey: TRANSACTION_QUERY_KEYS.rates(),
    queryFn: async () =>
      apiFetch<{ ok: boolean; rates: ServiceRateRow[]; can_edit: boolean }>(
        "/api/transactions/rates",
      ),
  });
};

export const useUpdateServiceRates = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, Array<{ key: string; rate_pct: number }>>({
    mutationFn: async (rates) => {
      await apiFetch<{ ok: boolean }>("/api/transactions/rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.rates() });
      toast.success("Service charge rates saved");
    },
    onError: (error) => toast.error(`Failed to save rates: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Tax & VAT
// ---------------------------------------------------------------------------

export const useTaxData = () => {
  return useQuery<
    {
      tin: string;
      filings: TaxFilingRow[];
      summary: Record<string, number> | null;
      summary_hidden?: boolean;
    },
    Error
  >({
    queryKey: TRANSACTION_QUERY_KEYS.tax(),
    queryFn: async () => apiFetch("/api/transactions/tax"),
  });
};

export const useUpdateTaxFiling = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { filing_id: string; status: "filed" | "in_progress" | "not_started"; remitted_amount?: number }
  >({
    mutationFn: async (payload) => {
      await apiFetch<{ ok: boolean }>("/api/transactions/tax", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.tax() });
      toast.success("Filing updated");
    },
    onError: (error) => toast.error(`Filing update failed: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Operational expenses (SA only)
// ---------------------------------------------------------------------------

export const useExpenses = (month?: string) => {
  return useQuery<{ expenses: ExpenseRow[]; total: number; forbidden?: boolean }, Error>({
    queryKey: [...TRANSACTION_QUERY_KEYS.expenses(), month ?? "all"],
    queryFn: async () => {
      try {
        const qs = month ? `?month=${month}` : "";
        return await apiFetch<{ ok: boolean; expenses: ExpenseRow[]; total: number }>(
          `/api/transactions/expenses${qs}`,
        );
      } catch (error) {
        if (error instanceof Error && /403|permission|super admin/i.test(error.message)) {
          return { expenses: [], total: 0, forbidden: true };
        }
        throw error;
      }
    },
  });
};

export const useSaveExpense = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    { id?: string; month: string; category: string; amount: number; note?: string }
  >({
    mutationFn: async (payload) => {
      const method = payload.id ? "PUT" : "POST";
      await apiFetch<{ ok: boolean }>("/api/transactions/expenses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.expenses() });
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.overview() });
      toast.success("Expense saved");
    },
    onError: (error) => toast.error(`Failed to save expense: ${error.message}`),
  });
};

// ---------------------------------------------------------------------------
// Finance metric visibility (SA only)
// ---------------------------------------------------------------------------

export const FINANCE_METRIC_LABELS: Record<string, string> = {
  total_transactions: "Total Transactions KPI",
  total_revenue: "Total Revenue KPI",
  total_customers: "Total Customers KPI",
  gross_profit: "Gross Profit KPI",
  revenue_chart: "Revenue Analytics chart",
  payment_methods: "Payment Methods chart",
  service_fee_revenue: "Service fee revenue",
  subscription_kpis: "Subscription KPIs (renewals, churn…)",
  tax_liability: "Tax & VAT liability",
  high_value_rows: "High-value (>₵500) rows",
};

export const useFinanceVisibility = (enabled = true) => {
  return useQuery<{ metrics: VisibilityMetric[]; forbidden?: boolean }, Error>({
    queryKey: TRANSACTION_QUERY_KEYS.visibility(),
    queryFn: async () => {
      try {
        return await apiFetch<{ ok: boolean; metrics: VisibilityMetric[] }>(
          "/api/transactions/visibility",
        );
      } catch (error) {
        if (error instanceof Error && /403|permission|super admin/i.test(error.message)) {
          return { metrics: [], forbidden: true };
        }
        throw error;
      }
    },
    enabled,
  });
};

export const useUpdateFinanceVisibility = () => {
  const queryClient = useQueryClient();
  return useMutation<
    void,
    Error,
    Array<{ metric_key: string; visible_to_finance: boolean }>
  >({
    mutationFn: async (metrics) => {
      await apiFetch<{ ok: boolean }>("/api/transactions/visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      toast.success("Finance visibility updated");
    },
    onError: (error) => toast.error(`Failed to save visibility: ${error.message}`),
  });
};
