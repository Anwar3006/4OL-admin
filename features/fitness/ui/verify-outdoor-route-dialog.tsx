"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useVerifyOutdoorRoute } from "@/features/fitness/data/useFitnessOutdoor";
import type { RouteClass, RouteVerifyAction } from "@/features/fitness/schema/moderation";

interface VerifyOutdoorRouteDialogProps {
  route: any | null;
  onClose: () => void;
}

// m-verify-route port (Gap Analysis Part F, phase 5): reviewer note,
// Official vs Community class, FitCoins base, Reject / Verify & Publish.
const VerifyOutdoorRouteDialog = ({ route, onClose }: VerifyOutdoorRouteDialogProps) => {
  const verifyRoute = useVerifyOutdoorRoute();
  const [note, setNote] = useState("");
  const [routeClass, setRouteClass] = useState<RouteClass>("community");
  const [fitcoins, setFitcoins] = useState(50);
  const [gpsAcknowledged, setGpsAcknowledged] = useState(false);

  useEffect(() => {
    if (route) {
      setNote("");
      setRouteClass("community");
      setFitcoins(Number(route.fitcoins_reward) || 50);
      setGpsAcknowledged(false);
    }
  }, [route]);

  if (!route) return null;

  const hasGps = Array.isArray(route.gps_data?.points) && route.gps_data.points.length > 0;

  const submit = (action: RouteVerifyAction) => {
    verifyRoute.mutate(
      {
        id: route.id,
        action,
        routeClass,
        fitcoinsReward: fitcoins,
        note: note || undefined,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!route} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🛡️ Verify Outdoor Route</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="card bg-slate-50/60">
            <div className="font-black text-sm text-slate-800">{route.name}</div>
            <div className="text-[11px] text-slate-500 mt-1 capitalize">
              {route.category} · {route.difficulty} ·{" "}
              {route.distance_km ? `${route.distance_km} km` : "no distance"} ·{" "}
              {route.area}
              {route.region ? `, ${route.region}` : ""}
            </div>
            {!hasGps && (
              <>
                <div className="mt-2 badge badge-amber text-[9px] font-black uppercase">
                  ⚠️ No GPS track — pin falls back to region center
                </div>
                <label className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={gpsAcknowledged}
                    onChange={(e) => setGpsAcknowledged(e.target.checked)}
                  />
                  I confirmed this route has no GPS track — publish with region fallback
                </label>
              </>
            )}
            {hasGps && (
              <div className="mt-2 badge badge-green text-[9px] font-black uppercase">
                ✅ GPS track confirmed ({route.gps_data.points.length} points)
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Route Class
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={cn(
                  "border rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                  routeClass === "official"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50",
                )}
                onClick={() => setRouteClass("official")}
              >
                🏅 Official (4OurLife vetted)
              </button>
              <button
                className={cn(
                  "border rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                  routeClass === "community"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50",
                )}
                onClick={() => setRouteClass("community")}
              >
                👥 Community submitted
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              FitCoins Base Reward
            </label>
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              value={fitcoins}
              onChange={(e) => setFitcoins(parseInt(e.target.value || "0", 10))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Verification Note
            </label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              rows={3}
              placeholder="Reason for approval/rejection, safety observations…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              className="btn btn-secondary flex-1"
              disabled={verifyRoute.isPending}
              onClick={() => submit("reject")}
            >
              ❌ Reject
            </button>
            <button
              className="btn btn-primary flex-1"
              disabled={verifyRoute.isPending || (!hasGps && !gpsAcknowledged)}
              onClick={() => submit("approve")}
            >
              {verifyRoute.isPending ? "Publishing…" : "✅ Verify & Publish"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerifyOutdoorRouteDialog;
