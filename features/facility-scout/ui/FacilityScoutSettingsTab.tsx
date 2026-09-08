"use client";

/**
 * Settings tab — Reward Tier Configuration (MB per facility type) and
 * FacilityScout Rules, persisted to facility_scout_config (Part N, N6).
 */

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateScoutConfig } from "@/features/facility-scout/data/useFacilityScout";
import type { FacilityScoutTabProps } from "@/features/facility-scout/schema/types";

type FormState = {
  reward_hospital_mb: number;
  reward_pharmacy_mb: number;
  reward_clinic_mb: number;
  reward_lab_mb: number;
  reward_chps_mb: number;
  max_pending_per_user: number;
  gps_match_radius_m: number;
  photo_required: boolean;
  duplicate_detection: "gps_name" | "gps_only" | "manual";
  collector_auto_assign: boolean;
  reward_disbursement: "auto" | "manual";
};

const DEFAULTS: FormState = {
  reward_hospital_mb: 1024,
  reward_pharmacy_mb: 500,
  reward_clinic_mb: 250,
  reward_lab_mb: 250,
  reward_chps_mb: 100,
  max_pending_per_user: 10,
  gps_match_radius_m: 50,
  photo_required: true,
  duplicate_detection: "gps_name",
  collector_auto_assign: false,
  reward_disbursement: "manual",
};

export default function FacilityScoutSettingsTab({ data, loading }: FacilityScoutTabProps) {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const updateConfig = useUpdateScoutConfig();

  useEffect(() => {
    if (data?.config && !hydrated) {
      setForm({ ...DEFAULTS, ...data.config } as FormState);
      setHydrated(true);
    }
  }, [data?.config, hydrated]);

  if (loading && !hydrated) {
    return <Card><CardContent className="py-10 text-center text-sm text-slate-500">Loading settings...</CardContent></Card>;
  }

  const save = () => updateConfig.mutate(form);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="section-heading">
            🎁 Reward Tier Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["reward_hospital_mb", "🏥 Hospital"],
              ["reward_pharmacy_mb", "💊 Pharmacy"],
              ["reward_clinic_mb", "🩺 Clinic"],
              ["reward_lab_mb", "🧪 Lab"],
              ["reward_chps_mb", "🏘️ CHPS"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <Label htmlFor={key} className="text-sm">{label}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={key}
                  type="number"
                  min={0}
                  className="w-28 text-right"
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: Math.max(0, Number(event.target.value)) })
                  }
                />
                <span className="text-xs font-bold text-slate-500">MB</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="section-heading">
            ⚙️ FacilityScout Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="max-pending" className="text-sm">Max pending per user</Label>
            <Input
              id="max-pending"
              type="number"
              min={1}
              max={100}
              className="w-28 text-right"
              value={form.max_pending_per_user}
              onChange={(event) =>
                setForm({ ...form, max_pending_per_user: Math.max(1, Number(event.target.value)) })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="gps-radius" className="text-sm">GPS match radius</Label>
            <div className="flex items-center gap-2">
              <Input
                id="gps-radius"
                type="number"
                min={5}
                max={1000}
                className="w-28 text-right"
                value={form.gps_match_radius_m}
                onChange={(event) =>
                  setForm({ ...form, gps_match_radius_m: Math.max(5, Number(event.target.value)) })
                }
              />
              <span className="text-xs font-bold text-slate-500">m</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Duplicate detection</Label>
            <select
              className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              value={form.duplicate_detection}
              onChange={(event) =>
                setForm({ ...form, duplicate_detection: event.target.value as FormState["duplicate_detection"] })
              }
            >
              <option value="gps_name">GPS + name</option>
              <option value="gps_only">GPS only</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Reward disbursement</Label>
            <select
              className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
              value={form.reward_disbursement}
              onChange={(event) =>
                setForm({ ...form, reward_disbursement: event.target.value as FormState["reward_disbursement"] })
              }
            >
              <option value="manual">Manual</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Photo required</Label>
            <Switch
              checked={form.photo_required}
              onCheckedChange={(checked) => setForm({ ...form, photo_required: checked })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm">Collector auto-assignment</Label>
            <Switch
              checked={form.collector_auto_assign}
              onCheckedChange={(checked) => setForm({ ...form, collector_auto_assign: checked })}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button onClick={save} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
