"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, CircleDollarSign, Receipt, TriangleAlert } from "lucide-react";
import KpiCard from "@/components/redesign/KpiCard";
import KpiGrid from "@/components/redesign/KpiGrid";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InfraCost = {
  id: string;
  service: string;
  provider: string | null;
  budget_30d: number | null;
  usage_30d: number | null;
  notes: string | null;
};

function formatCedis(value: number | null) {
  if (value == null) return "—";
  return `₵${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value)}`;
}

/**
 * Settings → Billing & GRA tab (Gap Analysis Part P, P-D5). Revenue KPIs
 * remain "—" until the transactions source (K-D7) ships; the infra cost
 * budget table is live from /api/settings/billing.
 */
export default function BillingTab() {
  const [loading, setLoading] = useState(true);
  const [costs, setCosts] = useState<InfraCost[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/billing", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load billing data.");
      setCosts(json.costs ?? []);
    } catch {
      setCosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalBudget = costs.reduce((sum, row) => sum + Number(row.budget_30d ?? 0), 0);
  const totalUsage = costs.reduce((sum, row) => sum + Number(row.usage_30d ?? 0), 0);

  return (
    <div className="space-y-4">
      <KpiGrid>
        <KpiCard
          icon={<CircleDollarSign className="size-4" />}
          label="Monthly revenue"
          value="—"
          variant="green"
          delta="Pending transactions source (K-D7)"
          deltaType="neutral"
        />
        <KpiCard
          icon={<Receipt className="size-4" />}
          label="Infra costs (30d budget)"
          value={formatCedis(costs.length ? totalBudget : null)}
          isLoading={loading}
          variant="blue"
        />
        <KpiCard
          icon={<Banknote className="size-4" />}
          label="Net revenue"
          value="—"
          variant="purple"
          delta="Revenue − costs once K-D7 ships"
          deltaType="neutral"
        />
        <KpiCard
          icon={<TriangleAlert className="size-4" />}
          label="Overdue invoices"
          value="—"
          variant="amber"
          delta="Pending accounts-payable feed"
          deltaType="neutral"
        />
      </KpiGrid>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Infrastructure cost budgets
          </CardTitle>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Actual 30d usage: <span className="font-semibold tabular-nums">{formatCedis(costs.length ? totalUsage : null)}</span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Budget (30d)</TableHead>
                <TableHead className="text-right">Usage (30d)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Loading cost budgets...
                  </TableCell>
                </TableRow>
              ) : costs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    No infrastructure cost budgets recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                costs.map((row) => {
                  const over =
                    row.usage_30d != null && row.budget_30d != null && row.usage_30d > row.budget_30d;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium text-slate-800 dark:text-slate-100">{row.service}</div>
                        {row.notes && (
                          <div className="text-xs text-slate-400">{row.notes}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-400">
                        {row.provider ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCedis(row.budget_30d)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCedis(row.usage_30d)}</TableCell>
                      <TableCell>
                        <Badge variant={over ? "destructive" : "emerald"}>
                          {over ? "Over budget" : "Within budget"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400">
        Revenue, net revenue and receivables KPIs activate automatically once the
        transactions source of record (decision K-D7) is wired in.{" "}
        <Link href="/transactions" className="font-medium text-emerald-600 hover:underline inline-flex items-center gap-1">
          Transactions dashboard <ArrowRight className="size-3" />
        </Link>
      </p>
    </div>
  );
}
