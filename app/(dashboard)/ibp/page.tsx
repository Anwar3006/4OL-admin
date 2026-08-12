"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, MapPin, RefreshCw, Search, Star } from "lucide-react";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type IBPBusiness = {
  id: string;
  business_name: string;
  business_category: string;
  specific_category: string;
  city: string;
  region: string;
  district: string;
  phone_number: string;
  whatsapp_number: string | null;
  website: string | null;
  status: string;
  is_featured: boolean | null;
  campaign_budget: number | null;
  total_spend: number | null;
  verified_at: string | null;
  created_at: string;
};

function formatMoney(value: number | null) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export default function IBPPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [businesses, setBusinesses] = useState<IBPBusiness[]>([]);

  const loadBusinesses = useCallback(async (term = search) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "50" });
      if (term.trim()) params.set("search", term.trim());

      const res = await fetch(`/api/ibp?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Unable to load IBP businesses.");
      }

      const body = await res.json();
      setBusinesses(body.businesses ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load IBP businesses.",
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadBusinesses("");
  }, [loadBusinesses]);

  const approved = useMemo(
    () => businesses.filter((business) => business.status === "approved").length,
    [businesses],
  );
  const featured = useMemo(
    () => businesses.filter((business) => business.is_featured).length,
    [businesses],
  );
  const spend = useMemo(
    () =>
      businesses.reduce(
        (sum, business) => sum + Number(business.total_spend ?? 0),
        0,
      ),
    [businesses],
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="IBP Businesses"
        subtitle="Individual Business Provider listing, status, location, and campaign spend"
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadBusinesses()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive">
          <Building2 className="h-4 w-4" />
          <AlertTitle>IBP data unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={<Building2 className="h-5 w-5" />} label="Businesses" value={loading ? "..." : businesses.length} variant="blue" delta="Latest 50" deltaType="neutral" />
        <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Approved" value={loading ? "..." : approved} variant="green" delta="Ready to trade" deltaType="up" />
        <KpiCard icon={<Star className="h-5 w-5" />} label="Featured" value={loading ? "..." : featured} variant="amber" delta="Promoted" deltaType="neutral" />
        <KpiCard icon={<MapPin className="h-5 w-5" />} label="Total Spend" value={loading ? "..." : formatMoney(spend)} variant="purple" delta="Campaign spend" deltaType="neutral" />
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-700">
            Business Directory
          </CardTitle>
          <form
            className="flex w-full gap-2 md:w-80"
            onSubmit={(event) => {
              event.preventDefault();
              loadBusinesses(search);
            }}
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search IBPs"
            />
            <Button type="submit" size="sm" disabled={loading}>
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Spend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && <EmptyRow colSpan={6} label="Loading IBP businesses..." />}
              {!loading && businesses.length === 0 && (
                <EmptyRow colSpan={6} label="No IBP businesses found." />
              )}
              {!loading &&
                businesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="min-w-[220px] whitespace-normal">
                      <div className="font-bold text-slate-800">
                        {business.business_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {business.website || "No website"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-700">
                        {business.business_category}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {business.specific_category}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{business.city}, {business.region}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {business.district}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{business.phone_number}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {business.whatsapp_number || "No WhatsApp"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={business.status === "approved" ? "emerald" : "amber"}>
                        {business.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatMoney(business.total_spend)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-32 text-center text-sm font-medium text-slate-400"
      >
        {label}
      </TableCell>
    </TableRow>
  );
}
