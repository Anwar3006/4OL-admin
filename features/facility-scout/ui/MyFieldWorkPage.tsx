"use client";

/**
 * A registrar's own field-work console: submissions assigned to them for
 * verification, and the facility_profile rows they've registered — bucketed
 * by status. Registering a facility reuses the exact same "+ Add Facility"
 * dialog every admin already uses (features/facilities/ui/add-facility-
 * dialog.tsx); it always lands `pending`, per register_facility_with_profile.
 * Editing a rejected facility goes through the narrower
 * registrar_update_own_facility RPC instead of the admin update path — see
 * actions/facility-admin.actions.ts for why the two aren't interchangeable.
 */

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { toast } from "sonner";
import PageHeader from "@/components/redesign/PageHeader";
import KpiCard from "@/components/redesign/KpiCard";
import AddFacilityDialog from "@/features/facilities/ui/add-facility-dialog";
import { useAddFacilityDialog } from "@/features/facilities/data/dialog-hooks";
import { registrarUpdateOwnFacility } from "@/actions/facility-admin.actions";
import { apiFetch, jsonBody } from "@/lib/api-fetch";

type Submission = {
  id: string;
  submission_ref: string;
  facility_name: string;
  facility_type: string;
  gps_location: string | null;
  photos: string[];
  region: string | null;
  status: string;
  priority: string;
  sla_due_at: string | null;
  admin_notes: string | null;
  created_at: string;
};

type Facility = {
  id: string;
  facility_name: string;
  facility_type: string;
  gps_address: string | null;
  latitude: number | null;
  longitude: number | null;
  region: string | null;
  area: string | null;
  district: string | null;
  status: "pending" | "active" | "inactive" | "rejected";
  status_reason: string | null;
  contact_number: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

type FieldWorkPayload = {
  collector: {
    id: string;
    employee_id: string;
    region: string[] | null;
    assigned_areas: string[] | null;
    total_submissions: number;
    approved_submissions: number;
    rejected_submissions: number;
    pending_submissions: number;
    last_active_at: string | null;
    is_active: boolean;
  } | null;
  submissions: Submission[];
  facilities: Facility[];
};

const containerStyle = { width: "100%", height: "320px" };
const center = { lat: 5.6037, lng: -0.187 };

function parseGpsLocation(value: string | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const [lat, lng] = value.split(",").map((part) => Number(part.trim()));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

const STATUS_BADGES: Record<string, string> = {
  field_review: "badge-amber",
  pending: "badge-blue",
  rejected: "badge-red",
  active: "badge-green",
};

function EditRejectedFacilityForm({
  facility,
  onDone,
}: {
  facility: Facility;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    facility_name: facility.facility_name ?? "",
    facility_type: facility.facility_type ?? "",
    contact_number: facility.contact_number ?? "",
    email: facility.email ?? "",
    gps_address: facility.gps_address ?? "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await registrarUpdateOwnFacility({ facilityId: facility.id, data: form });
      toast.success("Resubmitted for review.");
      onDone();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <input
        className="form-input w-full"
        placeholder="Facility name"
        value={form.facility_name}
        onChange={(e) => setForm({ ...form, facility_name: e.target.value })}
      />
      <input
        className="form-input w-full"
        placeholder="Facility type"
        value={form.facility_type}
        onChange={(e) => setForm({ ...form, facility_type: e.target.value })}
      />
      <input
        className="form-input w-full"
        placeholder="Contact number"
        value={form.contact_number}
        onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
      />
      <input
        className="form-input w-full"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        className="form-input w-full"
        placeholder="GPS address"
        value={form.gps_address}
        onChange={(e) => setForm({ ...form, gps_address: e.target.value })}
      />
      <div className="flex justify-end gap-2">
        <button className="btn btn-secondary btn-sm" onClick={onDone} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm text-white" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Resubmit for review"}
        </button>
      </div>
    </div>
  );
}

export default function MyFieldWorkPage() {
  const queryClient = useQueryClient();
  const addFacilityDialog = useAddFacilityDialog();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [linkingSubmission, setLinkingSubmission] = useState<Submission | null>(null);
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linking, setLinking] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const { data, isLoading, refetch } = useQuery<FieldWorkPayload>({
    queryKey: ["facility-scout", "my-field-work"],
    queryFn: () => apiFetch("/api/facilityscout/my-field-work"),
  });

  const submissions = data?.submissions ?? [];
  const facilities = data?.facilities ?? [];

  const toRegister = useMemo(
    () => submissions.filter((s) => s.status === "field_review"),
    [submissions],
  );
  const pendingFacilities = useMemo(
    () => facilities.filter((f) => f.status === "pending"),
    [facilities],
  );
  const rejectedFacilities = useMemo(
    () => facilities.filter((f) => f.status === "rejected"),
    [facilities],
  );
  const registeredFacilities = useMemo(
    () => facilities.filter((f) => f.status === "active"),
    [facilities],
  );
  // Own pending/active facilities not yet linked to a submission — what a
  // "To Register" row can be linked to once created via Add Facility.
  const linkableFacilities = useMemo(
    () => facilities.filter((f) => f.status === "pending" || f.status === "active"),
    [facilities],
  );

  const confirmLink = async () => {
    if (!linkingSubmission || !linkTargetId) return;
    setLinking(true);
    try {
      await apiFetch(
        `/api/facilityscout/submissions/${linkingSubmission.id}/register`,
        jsonBody({ matched_facility_id: linkTargetId }),
      );
      toast.success("Linked — this assignment is now registered.");
      setLinkingSubmission(null);
      setLinkTargetId("");
      queryClient.invalidateQueries({ queryKey: ["facility-scout", "my-field-work"] });
    } catch (error: any) {
      toast.error(error?.message ?? "Could not link the facility.");
    } finally {
      setLinking(false);
    }
  };

  if (!isLoading && data && !data.collector) {
    return (
      <div className="animate-in fade-in duration-500 space-y-6">
        <PageHeader title="🧭 My Field Work" subtitle="Submissions assigned to you for verification" />
        <div className="alert bg-amber-50 dark:bg-amber-500/15 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm font-medium">
          You&apos;re not yet set up as a field collector — an admin needs to link your
          account to a collector profile before submissions can be assigned to you.
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <PageHeader
        title="🧭 My Field Work"
        subtitle="Submissions assigned to you, and the facilities you've registered"
      />

      {/*
        All four are current-state counts of this collector's own backlog
        (no dated history to chart). "To Register" is the one actionable
        queue — submissions assigned to this collector that still need a
        registration — so it stays at default size; the other three are
        reference counts and go small.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon="📍" label="To Register" value={String(toRegister.length)} variant="amber" />
        <KpiCard icon="⏳" label="Pending Review" value={String(pendingFacilities.length)} variant="blue" size="sm" />
        <KpiCard icon="🚫" label="Rejected" value={String(rejectedFacilities.length)} variant="red" size="sm" />
        <KpiCard icon="✅" label="Registered" value={String(registeredFacilities.length)} variant="green" size="sm" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">Map</h3>
          <p className="text-2xs text-slate-500">
            🟠 Assigned — go register · 🟢 Registered &amp; approved
          </p>
        </div>
        {isLoaded ? (
          <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={7}>
            {toRegister.map((s) => {
              const pos = parseGpsLocation(s.gps_location);
              if (!pos) return null;
              return (
                <Marker
                  key={s.id}
                  position={pos}
                  title={s.facility_name}
                  icon={{ url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png" }}
                />
              );
            })}
            {registeredFacilities.map((f) =>
              f.latitude != null && f.longitude != null ? (
                <Marker
                  key={f.id}
                  position={{ lat: f.latitude, lng: f.longitude }}
                  title={f.facility_name}
                  icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
                />
              ) : null,
            )}
          </GoogleMap>
        ) : (
          <div className="h-80 flex items-center justify-center text-xs text-slate-400">
            Loading map…
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📍 To Register ({toRegister.length})</h3>
        </div>
        <div className="space-y-3 p-4">
          {isLoading && <p className="text-xs text-slate-400">Loading…</p>}
          {!isLoading && toRegister.length === 0 && (
            <p className="text-xs text-slate-400">Nothing assigned to you right now.</p>
          )}
          {toRegister.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {s.facility_name}
                  </div>
                  <div className="text-2xs text-slate-500 capitalize">
                    {s.facility_type} · {s.region ?? "no region"} · {s.submission_ref}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGES[s.status] ?? "badge-slate"} text-3xs uppercase`}>
                  {s.priority}
                </span>
              </div>
              {s.admin_notes && (
                <p className="text-2xs text-slate-500 italic">Note: {s.admin_notes}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn btn-primary btn-sm text-white"
                  onClick={() => addFacilityDialog.open()}
                >
                  + Register this facility
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setLinkingSubmission(s)}
                  disabled={linkableFacilities.length === 0}
                  title={
                    linkableFacilities.length === 0
                      ? "Register a facility first, then link it here"
                      : undefined
                  }
                >
                  Link to a facility I registered
                </button>
              </div>
              {linkingSubmission?.id === s.id && (
                <div className="flex items-center gap-2 pt-1">
                  <select
                    className="form-select text-xs"
                    value={linkTargetId}
                    onChange={(e) => setLinkTargetId(e.target.value)}
                  >
                    <option value="">Select a facility…</option>
                    {linkableFacilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.facility_name} ({f.status})
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary btn-sm text-white"
                    onClick={confirmLink}
                    disabled={!linkTargetId || linking}
                  >
                    {linking ? "Linking…" : "Confirm"}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setLinkingSubmission(null);
                      setLinkTargetId("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⏳ Pending Review ({pendingFacilities.length})</h3>
          </div>
          <div className="space-y-2 p-4">
            {pendingFacilities.length === 0 && (
              <p className="text-xs text-slate-400">Nothing awaiting admin review.</p>
            )}
            {pendingFacilities.map((f) => (
              <div key={f.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {f.facility_name}
                </div>
                <div className="text-2xs text-slate-500 capitalize">{f.facility_type}</div>
                <p className="text-2xs text-amber-600 mt-1">🔒 Locked until admin reviews it.</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🚫 Rejected ({rejectedFacilities.length})</h3>
          </div>
          <div className="space-y-2 p-4">
            {rejectedFacilities.length === 0 && (
              <p className="text-xs text-slate-400">No rejections.</p>
            )}
            {rejectedFacilities.map((f) => (
              <div key={f.id} className="rounded-lg border border-red-200 dark:border-red-500/30 p-3">
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {f.facility_name}
                </div>
                <div className="text-2xs text-slate-500 capitalize">{f.facility_type}</div>
                {f.status_reason && (
                  <p className="text-2xs text-red-600 mt-1">Reason: {f.status_reason}</p>
                )}
                {editingId === f.id ? (
                  <EditRejectedFacilityForm
                    facility={f}
                    onDone={() => {
                      setEditingId(null);
                      refetch();
                    }}
                  />
                ) : (
                  <button
                    className="btn btn-secondary btn-sm mt-2"
                    onClick={() => setEditingId(f.id)}
                  >
                    Edit &amp; resubmit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">✅ Registered ({registeredFacilities.length})</h3>
        </div>
        <div className="space-y-2 p-4">
          {registeredFacilities.length === 0 && (
            <p className="text-xs text-slate-400">Nothing approved yet.</p>
          )}
          {registeredFacilities.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg border border-emerald-200 dark:border-emerald-500/30 p-3"
            >
              <div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {f.facility_name}
                </div>
                <div className="text-2xs text-slate-500 capitalize">
                  {f.facility_type} · {f.region ?? ""}
                </div>
              </div>
              <span className="badge badge-green text-3xs uppercase">Live</span>
            </div>
          ))}
        </div>
      </div>

      <AddFacilityDialog />
    </div>
  );
}
