"use client";

/**
 * Rewards Queue tab — data-bundle reward tiers, summary and disbursement
 * table (Part N, N-D4/N-D5: rewards are mobile data MB; Disburse marks
 * delivery_status=sent — real MNO API integration deferred).
 */

import React, { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDisburseScoutReward } from "@/features/facility-scout/data/useFacilityScout";
import type { FacilityScoutTabProps } from "@/features/facility-scout/schema/types";

const NETWORK_LABEL: Record<string, string> = {
  mtn: "MTN",
  vodafone: "Vodafone",
  airteltigo: "AirtelTigo",
};

export default function RewardsQueueTab({ data, loading }: FacilityScoutTabProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const disburse = useDisburseScoutReward();

  const referrals = data?.referrals ?? [];
  const config = data?.config;

  const queue = useMemo(
    () => referrals.filter((referral: any) => referral.reward_mb != null),
    [referrals],
  );
  const pending = queue.filter((r: any) => r.delivery_status === "pending");
  const sent = queue.filter((r: any) => r.delivery_status === "sent");

  const tiers = [
    { label: "🏥 Hospital", mb: config?.reward_hospital_mb ?? 1024 },
    { label: "💊 Pharmacy", mb: config?.reward_pharmacy_mb ?? 500 },
    { label: "🩺 Clinic", mb: config?.reward_clinic_mb ?? 250 },
    { label: "🧪 Lab", mb: config?.reward_lab_mb ?? 250 },
    { label: "🏘️ CHPS", mb: config?.reward_chps_mb ?? 100 },
  ];

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const disburseSelected = () => {
    if (selected.length === 0) return;
    disburse.mutate({ ids: selected }, { onSuccess: () => setSelected([]) });
  };

  const maskPhone = (phone?: string | null) =>
    phone && phone.length > 4 ? `••• ${phone.slice(-4)}` : "—";

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription className="text-xs">
          Rewards are mobile-data bundles sent to the submitter's phone via MNO APIs.
          Disburse records the send; live MTN/Vodafone integration is a later phase (N-D5).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="section-heading">
              🎁 Reward Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {tiers.map((tier) => (
              <div key={tier.label} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-center">
                <div className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">{tier.label}</div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-400">{tier.mb} MB</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-heading">
              📈 Rewards Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-widest">Disbursed</div>
              <div className="text-xl font-black text-slate-800 dark:text-slate-200">{sent.length}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-widest">Pending</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400">{pending.length}</div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-widest">Data Sent</div>
              <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                {sent.reduce((sum: number, r: any) => sum + Number(r.reward_mb ?? 0), 0)} MB
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
              <div className="text-xs text-slate-500 uppercase tracking-widest">Network Mix</div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {Object.entries(NETWORK_LABEL)
                  .map(([key, label]) => `${label} ${queue.filter((r: any) => r.network === key).length}`)
                  .join(" · ")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          disabled={selected.length === 0 || disburse.isPending}
          onClick={disburseSelected}
        >
          Disburse Selected ({selected.length})
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={pending.length > 0 && selected.length === pending.length}
                    onCheckedChange={() =>
                      setSelected(selected.length === pending.length ? [] : pending.map((r: any) => r.id))
                    }
                    aria-label="Select all pending"
                  />
                </TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                    Loading rewards queue...
                  </TableCell>
                </TableRow>
              )}
              {!loading && queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                    No data-bundle rewards queued — rewards appear when scout submissions are registered.
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                queue.map((referral: any) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      {referral.delivery_status === "pending" && (
                        <Checkbox
                          checked={selected.includes(referral.id)}
                          onCheckedChange={() => toggle(referral.id)}
                          aria-label="Select reward"
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-bold">
                      {referral.facility_profile?.facility_name ?? "—"}
                    </TableCell>
                    <TableCell className="font-black text-emerald-700 dark:text-emerald-400">{referral.reward_mb} MB</TableCell>
                    <TableCell>{NETWORK_LABEL[referral.network ?? ""] ?? referral.network ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{maskPhone(referral.delivery_phone)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={referral.delivery_status === "sent" ? "emerald" : referral.delivery_status === "failed" ? "destructive" : "amber"}
                        className="capitalize"
                      >
                        {referral.delivery_status ?? "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {referral.delivery_status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disburse.isPending}
                          onClick={() => disburse.mutate({ id: referral.id })}
                        >
                          Disburse
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
