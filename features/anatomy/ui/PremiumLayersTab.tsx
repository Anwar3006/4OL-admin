"use client";

/**
 * Anatomy "Premium Layers" tab (Gap Analysis Part AM, P2–P5).
 *
 * Admin toggle for which anatomy layers are premium-gated on the mobile
 * explorer, plus per-region "deep-dive pack" flags. Mobile reads the same
 * state via the get_anatomy_premium_config() RPC; entitlement enforcement
 * stays client-side (useEntitlement).
 */

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  useAnatomyPremiumConfig,
  useUpdateAnatomyPremiumConfig,
  type AnatomyPremiumLayers,
} from "@/features/anatomy/data/useAnatomy";

const LAYER_META: {
  key: keyof AnatomyPremiumLayers;
  icon: string;
  name: string;
  description: string;
}[] = [
  {
    key: "organs",
    icon: "🫀",
    name: "Organs & Body Systems layer",
    description:
      "The translucent organs overlay inside the 3D explorer (AL-D9 core premium).",
  },
  {
    key: "tours",
    icon: "🧭",
    name: "Guided body tours",
    description:
      "Auto-zooming region-by-region tour with captions (P3).",
  },
  {
    key: "quiz",
    icon: "🎯",
    name: "Anatomy quiz",
    description:
      "Which-body-part quiz generated from the Diseases & Conditions mapping (P3).",
  },
];

const PremiumLayersTab = () => {
  const { data, isLoading } = useAnatomyPremiumConfig();
  const save = useUpdateAnatomyPremiumConfig();

  const [layers, setLayers] = useState<AnatomyPremiumLayers>({
    organs: true,
    tours: true,
    quiz: true,
  });
  const [premiumRegions, setPremiumRegions] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setLayers(data.layers);
    setPremiumRegions(
      (data.regions ?? []).filter((r) => r.is_premium).map((r) => r.key),
    );
  }, [data]);

  const toggleLayer = (key: keyof AnatomyPremiumLayers) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleRegion = (key: string) =>
    setPremiumRegions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  return (
    <div className="space-y-5">
      <div className="bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-sky-800">
        💎 What is gated here is enforced on mobile by the user&apos;s 4OurLife
        Premium entitlement. Switch a layer OFF to make it free for everyone;
        ON to keep it premium. Changes apply on the next app load.
      </div>

      {!data?.applied && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-[11px] font-bold text-amber-800">
          ⏳ Migration <code>20260824_anatomy_premium_am.sql</code> has not been
          applied yet — showing defaults. Saving will fail until it is applied.
        </div>
      )}

      {isLoading ? (
        <p className="text-[11px] font-bold text-slate-400 py-6 text-center">
          Loading premium configuration…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LAYER_META.map((layer) => {
              const on = layers[layer.key];
              return (
                <div
                  key={layer.key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4"
                >
                  <p className="text-2xl">{layer.icon}</p>
                  <div className="flex-1">
                    <p className="text-[13px] font-black text-slate-800">
                      {layer.name}
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {layer.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggleLayer(layer.key)}
                    className={cn(
                      "shrink-0 w-11 h-6 rounded-full transition-colors relative",
                      on ? "bg-emerald-600" : "bg-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        on ? "left-[22px]" : "left-0.5",
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                🗺️ Deep-dive region packs (P2)
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Checked regions zoom behind the premium paywall; free users see
                an upsell card instead.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(data?.regions ?? []).map((region) => {
                const on = premiumRegions.includes(region.key);
                return (
                  <button
                    key={region.key}
                    type="button"
                    onClick={() => toggleRegion(region.key)}
                    className={cn(
                      "rounded-full px-4 py-2 text-[11px] font-black border transition-colors",
                      on
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {on ? "🔒 " : ""}
                    {region.label}
                  </button>
                );
              })}
              {(data?.regions ?? []).length === 0 && (
                <p className="text-[11px] font-bold text-slate-400">
                  No regions found — apply the Part AL migration first.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="btn btn-primary text-white font-black uppercase tracking-widest text-[10px]"
              disabled={save.isPending || !data?.applied}
              onClick={() =>
                save.mutate({ layers, premium_regions: premiumRegions })
              }
            >
              {save.isPending ? "Saving…" : "💾 Save Premium Layers"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PremiumLayersTab;
