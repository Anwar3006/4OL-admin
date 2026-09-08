"use client";

/**
 * Emergency Dispatch dialog — mirrors mockup `m-bt-emergency` (Part L, L7):
 * case details, fleet dropdown, and the deterministic "AI routing"
 * suggestion panel (top-3 nearest facilities with capacity for the
 * required ward — haversine, no ML).
 */

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateAmbulanceDispatch,
  useRouteSuggestions,
} from "@/features/bed-tracker/data/useBedTracker";

const CASE_TYPES = [
  "RTA",
  "Obstetric",
  "Cardiac",
  "Trauma",
  "Respiratory",
  "Neurological",
  "Pediatric",
  "Other",
];

const WARDS = [
  "general",
  "icu",
  "surgical",
  "medical",
  "maternity",
  "pediatric",
  "psychiatric",
  "geriatric",
];

export function EmergencyDispatchDialog({
  open,
  onOpenChange,
  fleet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleet: any[];
}) {
  const [emergencyType, setEmergencyType] = useState("RTA");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupGps, setPickupGps] = useState("");
  const [requiredWard, setRequiredWard] = useState("general");
  const [ambulanceId, setAmbulanceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientAgeGroup, setPatientAgeGroup] = useState("");
  const [callerName, setCallerName] = useState("");
  const [callerPhone, setCallerPhone] = useState("");
  const [priority, setPriority] = useState("urgent");
  const [notes, setNotes] = useState("");
  const dispatchMutation = useCreateAmbulanceDispatch();

  const gpsValid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(pickupGps);
  const suggestions = useRouteSuggestions({
    gps: open && gpsValid ? pickupGps : undefined,
    wardType: open ? requiredWard : undefined,
  });

  useEffect(() => {
    if (!open) {
      setPickupAddress("");
      setPickupGps("");
      setAmbulanceId("");
      setDestinationId("");
      setNotes("");
    }
  }, [open]);

  const availableUnits = useMemo(
    () => fleet.filter((unit) => unit.status === "available" || unit.status === "standby"),
    [fleet],
  );

  const submit = () => {
    if (!ambulanceId || !destinationId || pickupAddress.trim().length < 2) return;
    dispatchMutation.mutate(
      {
        ambulance_id: ambulanceId,
        emergency_type: emergencyType,
        pickup_address: pickupAddress,
        pickup_gps: gpsValid ? pickupGps : undefined,
        required_ward: requiredWard,
        destination_facility_id: destinationId,
        patient_gender: patientGender || undefined,
        patient_age_group: patientAgeGroup || undefined,
        caller_name: callerName || undefined,
        caller_phone: callerPhone || undefined,
        priority,
        notes: notes || undefined,
        ai_routing_used: suggestions.data?.suggestions?.some(
          (s: any) => s.facility_id === destinationId,
        ) ?? false,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🚨 Emergency Dispatch</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Case type</Label>
              <select
                className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                value={emergencyType}
                onChange={(event) => setEmergencyType(event.target.value)}
              >
                {CASE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Required ward</Label>
              <select
                className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm capitalize"
                value={requiredWard}
                onChange={(event) => setRequiredWard(event.target.value)}
              >
                {WARDS.map((ward) => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ed-address">Pickup address *</Label>
              <Input id="ed-address" value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ed-gps">Pickup GPS (lat,lng)</Label>
              <Input id="ed-gps" value={pickupGps} onChange={(event) => setPickupGps(event.target.value)} placeholder="5.6037,-0.1870" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Patient gender</Label>
              <select
                className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                value={patientGender}
                onChange={(event) => setPatientGender(event.target.value)}
              >
                <option value="">Not recorded</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ed-age">Age group</Label>
              <Input id="ed-age" value={patientAgeGroup} onChange={(event) => setPatientAgeGroup(event.target.value)} placeholder="e.g. 25-34" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ed-caller">Caller name</Label>
              <Input id="ed-caller" value={callerName} onChange={(event) => setCallerName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ed-phone">Caller phone</Label>
              <Input id="ed-phone" value={callerPhone} onChange={(event) => setCallerPhone(event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Dispatching ambulance *</Label>
              <select
                className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                value={ambulanceId}
                onChange={(event) => setAmbulanceId(event.target.value)}
              >
                <option value="">Select unit...</option>
                {availableUnits.map((unit: any) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.ambulance_code} — {unit.service_provider ?? "NAS Ghana"} ({unit.region ?? "—"})
                  </option>
                ))}
              </select>
              {fleet.length > 0 && availableUnits.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">No available units — all ambulances are on runs.</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <select
                className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm capitalize"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>AI routing suggestion (nearest {requiredWard} capacity)</Label>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              {!gpsValid && (
                <p className="text-xs text-slate-500">Enter valid pickup GPS to get routing suggestions.</p>
              )}
              {gpsValid && suggestions.isLoading && (
                <p className="text-xs text-slate-500">Computing nearest facilities...</p>
              )}
              {gpsValid && !suggestions.isLoading && (suggestions.data?.suggestions?.length ?? 0) === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No tracked facility has {requiredWard} capacity near this GPS — pick a destination manually.
                </p>
              )}
              {suggestions.data?.suggestions?.map((suggestion: any) => (
                <button
                  key={suggestion.facility_id}
                  type="button"
                  onClick={() => setDestinationId(suggestion.facility_id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                    destinationId === suggestion.facility_id
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15"
                      : "border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <span className="font-bold">{suggestion.facility_name}</span>
                  <span className="text-slate-500">
                    {Number(suggestion.distance_km ?? 0).toFixed(1)} km ·{" "}
                    {suggestion.available_beds} beds · ETA{" "}
                    {Math.max(1, Math.round((Number(suggestion.distance_km ?? 0) / 40) * 60))} min
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ed-notes">Notes</Label>
            <Textarea id="ed-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={submit}
            disabled={dispatchMutation.isPending || !ambulanceId || !destinationId || pickupAddress.trim().length < 2}
          >
            {dispatchMutation.isPending ? "Dispatching..." : "Confirm Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
