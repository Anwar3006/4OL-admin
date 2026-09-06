"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GHANA_REGIONS } from "@/lib/shared-constants";
import { getSupabaseClient } from "@/lib/supabase";
import { useDrugs } from "@/features/medication-reminder/data/useDrugs";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

const PROXIMITY_OPTIONS = [
  { value: "1", label: "Within 1 km" },
  { value: "2", label: "Within 2 km" },
  { value: "5", label: "Within 5 km" },
  { value: "district", label: "Whole district" },
  { value: "region", label: "Whole region" },
];

interface PharmacyOption {
  id: string;
  business_name: string;
  region: string | null;
}

/**
 * Pharmacy Marketing Campaign modal (Gap Analysis B.1 modal m-pharmacy-notif).
 * Targets users who logged the medication within the pharmacy's region.
 * Dispatch rides the Epic 27 notification pipeline: the campaign is created
 * as a draft `notification_campaigns` row with the pharmacy targeting stored
 * in metadata + segment_filter, then goes through the standard approval flow.
 */
export default function PharmacyCampaignModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [pharmacyId, setPharmacyId] = useState("");
  const [drugSearch, setDrugSearch] = useState("");
  const [drugName, setDrugName] = useState("");
  const [condition, setCondition] = useState("");
  const [region, setRegion] = useState("");
  const [proximity, setProximity] = useState("5");
  const [message, setMessage] = useState("");
  const [reach, setReach] = useState<number | null>(null);
  const [reachLoading, setReachLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const debouncedDrugSearch = useDebounce(drugSearch, 400);
  const { data: drugResults } = useDrugs({
    search: debouncedDrugSearch || undefined,
    limit: 6,
  });

  const selectedPharmacy = pharmacies.find((p) => p.id === pharmacyId);

  // Load IBP-verified pharmacies.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const supabase = await getSupabaseClient();
      const { data } = await supabase
        .from("ibp")
        .select("id, business_name, region, business_category")
        .not("verified_at", "is", null)
        .limit(200);
      const list = (data ?? [])
        .filter(
          (b: { business_category?: string | null }) =>
            /pharm/i.test(b.business_category ?? ""),
        )
        .map((b: { id: string; business_name: string; region: string | null }) => ({
          id: b.id,
          business_name: b.business_name,
          region: b.region,
        }));
      setPharmacies(list);
    })().catch(() => setPharmacies([]));
  }, [open]);

  // Auto-set region from the selected pharmacy (mockup: GPS region auto).
  useEffect(() => {
    if (selectedPharmacy?.region) setRegion(selectedPharmacy.region);
  }, [pharmacyId]); // eslint-disable-line

  // Default message preview.
  useEffect(() => {
    if (drugName && selectedPharmacy) {
      setMessage(
        `${selectedPharmacy.business_name} now has ${drugName} in stock. Visit us or order for delivery near you.`,
      );
    }
  }, [drugName, pharmacyId]); // eslint-disable-line

  const segmentFilter = useMemo(
    () => ({
      audience: "custom",
      has_medication_history: drugName || undefined,
      region: region || undefined,
      within_km: Number.isFinite(Number(proximity)) ? Number(proximity) : undefined,
    }),
    [drugName, region, proximity],
  );

  // Debounced reach estimate via the Epic 27 segment-preview endpoint.
  useEffect(() => {
    if (!open || !drugName || !region) {
      setReach(null);
      return;
    }
    const handle = setTimeout(async () => {
      setReachLoading(true);
      try {
        const res = await fetch("/api/notifications/segment-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segmentFilter }),
        });
        if (res.ok) {
          const json = await res.json();
          setReach(typeof json === "number" ? json : (json.count ?? null));
        } else {
          setReach(null);
        }
      } catch {
        setReach(null);
      } finally {
        setReachLoading(false);
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [open, segmentFilter, drugName, region]);

  const handleLaunch = async () => {
    if (!pharmacyId || !drugName || !region || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Pharmacy campaign — ${selectedPharmacy?.business_name ?? "pharmacy"}: ${drugName}`,
          body: message.trim(),
          type: "marketing",
          segment_filter: segmentFilter,
          metadata: {
            pharmacy_campaign: {
              pharmacy_id: pharmacyId,
              pharmacy_name: selectedPharmacy?.business_name ?? null,
              target_medication: drugName,
              target_condition: condition || null,
              proximity,
            },
            created_from: "medication_reminder_pharmacy_modal",
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create campaign.");
      toast.success("Campaign created as draft — submit it for approval in Notifications.");
      onOpenChange(false);
      router.push("/notifications");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to launch campaign.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🏥 Pharmacy Marketing Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className={labelCls}>IBP-Verified Pharmacy</label>
            <select className={inputCls} value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)}>
              <option value="">— Select pharmacy —</option>
              {pharmacies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business_name} {p.region ? `(${p.region})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Medication Available</label>
            {!drugName ? (
              <>
                <input
                  className={inputCls}
                  placeholder="🔍 Search the drug catalog…"
                  value={drugSearch}
                  onChange={(e) => setDrugSearch(e.target.value)}
                />
                {drugSearch && (
                  <div className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
                    {(drugResults?.drugs || []).map((d) => (
                      <button
                        key={d.id}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50/50 cursor-pointer"
                        onClick={() => setDrugName(d.name)}
                      >
                        <span className="font-bold text-slate-700">{d.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2">
                <span className="text-xs font-bold text-emerald-800">{drugName}</span>
                <button
                  className="text-[10px] font-bold text-slate-400 hover:text-red-500 cursor-pointer"
                  onClick={() => setDrugName("")}
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Target Health Condition</label>
              <input
                className={inputCls}
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                placeholder="e.g. Hypertension"
              />
            </div>
            <div>
              <label className={labelCls}>GPS Region (auto)</label>
              <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">— Select region —</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Max Proximity</label>
            <select className={inputCls} value={proximity} onChange={(e) => setProximity(e.target.value)}>
              {PROXIMITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Message</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-[11px] font-medium text-slate-600">
            📡 Estimated reach:{" "}
            {reachLoading ? (
              <span className="text-slate-400">calculating…</span>
            ) : reach !== null ? (
              <strong className="text-emerald-700">
                {reach.toLocaleString()} user{reach === 1 ? "" : "s"}
              </strong>
            ) : (
              <span className="text-slate-400">select medication + region</span>
            )}{" "}
            (opted-out users excluded)
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm disabled:opacity-50"
            disabled={sending || !pharmacyId || !drugName || !region || !message.trim()}
            onClick={handleLaunch}
          >
            {sending ? "Creating…" : "🚀 Launch Campaign"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
