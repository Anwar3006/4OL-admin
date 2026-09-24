"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

type ProviderPlan = {
  id: string; name: string; description: string | null; price: number; period: string;
  privileges: string[]; tier_limit: number; department_limit: number; is_active: boolean;
  active_subscribers: number;
};

function PlanEditor({ plan }: { plan: ProviderPlan }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState(String(plan.price));
  const [seats, setSeats] = useState(String(plan.tier_limit));
  const [departments, setDepartments] = useState(String(plan.department_limit));
  const save = useMutation({
    mutationFn: () => apiFetch<{ data: ProviderPlan }>(`/api/subscriptions/provider-plans/${plan.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(price), tier_limit: Number(seats), department_limit: Number(departments) }),
    }),
    onSuccess: () => { toast.success("Provider plan updated"); queryClient.invalidateQueries({ queryKey: ["provider-plans"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 space-y-4">
    <div><h3 className="font-black text-slate-900 dark:text-white">{plan.name}</h3><p className="mt-1 text-xs text-slate-500">{plan.description}</p></div>
    <div className="grid grid-cols-3 gap-3 text-xs"><label className="font-bold text-slate-500">Monthly GH₵<input aria-label={`${plan.name} monthly price`} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border p-2 text-slate-900" /></label><label className="font-bold text-slate-500">Staff seats<input aria-label={`${plan.name} staff seats`} value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border p-2 text-slate-900" /></label><label className="font-bold text-slate-500">Departments<input aria-label={`${plan.name} departments`} value={departments} onChange={(e) => setDepartments(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border p-2 text-slate-900" /></label></div>
    <div className="text-xs text-slate-500">{plan.active_subscribers} active organisation{plan.active_subscribers === 1 ? "" : "s"} · {plan.privileges.join(" · ")}</div>
    <div className="flex items-center justify-between"><span className="text-sm font-black text-emerald-700">{formatCurrency(Number(price) || 0, { decimals: 0 })}/month</span><Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button></div>
  </div>;
}

export default function ProviderPlansTab() {
  const plans = useQuery({ queryKey: ["provider-plans"], queryFn: () => apiFetch<{ data: ProviderPlan[] }>("/api/subscriptions/provider-plans") });
  if (plans.isLoading) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  if (plans.error) return <p className="text-sm text-red-600">{plans.error.message}</p>;
  return <section className="mt-4 space-y-4"><div><h2 className="text-sm font-black uppercase tracking-widest text-slate-600">Provider & organisation plans</h2><p className="mt-1 text-xs text-slate-500">Business privileges cover active staff in the organisation. Plus grants consumer Premium only to its named member-provider administrator.</p></div><div className="grid gap-4 lg:grid-cols-2">{(plans.data?.data ?? []).map((plan) => <PlanEditor key={plan.id} plan={plan} />)}</div></section>;
}
