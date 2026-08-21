"use client";

/**
 * Register BedTracker Facility dialog — mirrors mockup `m-bt-facility`
 * (Part L): facility picker against facility_profile, GHS code, GPS,
 * admin contact, wards-to-track checkboxes, hardware option and
 * subscription tier (metadata only — L-D7).
 */

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-fetch";
import { useRegisterBedTrackerFacility } from "@/hooks/supabase-calls/useBedTracker";

const WARD_TYPES = [
  "general",
  "icu",
  "surgical",
  "medical",
  "maternity",
  "pediatric",
  "psychiatric",
  "geriatric",
] as const;

type FacilityOption = {
  id: string;
  facility_name: string;
  facility_type: string | null;
  region: string | null;
};

export function RegisterFacilityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [options, setOptions] = useState<FacilityOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [facilityId, setFacilityId] = useState("");
  const [ghsCode, setGhsCode] = useState("");
  const [gps, setGps] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [wards, setWards] = useState<string[]>(["general"]);
  const [hardware, setHardware] = useState("lease");
  const [tier, setTier] = useState("starter");
  const register = useRegisterBedTrackerFacility();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setOptionsLoading(true);
    apiFetch<{ options: FacilityOption[] }>("/api/facilities/options")
      .then((result) => {
        if (!cancelled) setOptions(result.options);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedFacility = useMemo(
    () => options.find((option) => option.id === facilityId),
    [options, facilityId],
  );

  const toggleWard = (ward: string) => {
    setWards((current) =>
      current.includes(ward)
        ? current.filter((item) => item !== ward)
        : [...current, ward],
    );
  };

  const submit = () => {
    if (!facilityId || wards.length === 0) return;
    register.mutate(
      {
        facility_id: facilityId,
        ghs_facility_code: ghsCode || undefined,
        gps_coordinates: gps || undefined,
        facility_admin_name: adminName || undefined,
        facility_admin_phone: adminPhone || undefined,
        hardware_option: hardware,
        subscription_tier: tier,
        wards_to_track: wards,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setFacilityId("");
          setGhsCode("");
          setGps("");
          setAdminName("");
          setAdminPhone("");
          setWards(["general"]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🏥 Register BedTracker Facility</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Facility</Label>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={facilityId}
              onChange={(event) => setFacilityId(event.target.value)}
            >
              <option value="">
                {optionsLoading ? "Loading facilities..." : "Select a facility..."}
              </option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.facility_name} — {option.region ?? "No region"}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="bt-ghs">GHS facility code</Label>
              <Input id="bt-ghs" value={ghsCode} onChange={(event) => setGhsCode(event.target.value)} placeholder="GHS-0000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bt-gps">GPS coordinates</Label>
              <Input id="bt-gps" value={gps} onChange={(event) => setGps(event.target.value)} placeholder="5.6037,-0.1870" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="bt-admin-name">Facility admin name</Label>
              <Input id="bt-admin-name" value={adminName} onChange={(event) => setAdminName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bt-admin-phone">Admin contact</Label>
              <Input id="bt-admin-phone" value={adminPhone} onChange={(event) => setAdminPhone(event.target.value)} placeholder="+233..." />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Wards to track</Label>
            <div className="grid grid-cols-2 gap-2">
              {WARD_TYPES.map((ward) => (
                <label key={ward} className="flex items-center gap-2 text-sm capitalize">
                  <Checkbox
                    checked={wards.includes(ward)}
                    onCheckedChange={() => toggleWard(ward)}
                  />
                  {ward}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Hardware option</Label>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm capitalize"
                value={hardware}
                onChange={(event) => setHardware(event.target.value)}
              >
                <option value="lease">Lease</option>
                <option value="purchase">Purchase</option>
                <option value="byo">Bring your own</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Subscription tier</Label>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm capitalize"
                value={tier}
                onChange={(event) => setTier(event.target.value)}
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {selectedFacility && (
            <p className="text-xs text-slate-500">
              A tablet dashboard can be provisioned for {selectedFacility.facility_name};
              BedTracker tracks its online status and last ping.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={register.isPending || !facilityId || wards.length === 0}
          >
            {register.isPending ? "Registering..." : "Register Facility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
