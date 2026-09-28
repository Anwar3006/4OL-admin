"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useBodyParts,
  useAnatomyRegions3D,
  useHotspots3D,
  useUpsertHotspot3D,
  useDeleteHotspot3D,
} from "@/features/anatomy/data/useAnatomy";
import { resolveAnatomyEngine } from "@/features/anatomy/lib/atlas-engine";
import {
  decodeInbound,
  encodeIntent,
  type EditorIntent,
} from "@/features/anatomy/lib/atlas-bridge";

/**
 * 3D Pin Placement editor (Gap Analysis Part AL, AL-D3). Embeds a render
 * engine inside an iframe and drives it over a postMessage bridge. In
 * placement mode a tap on the model unprojects to model-space coordinates,
 * which are saved as anatomy_hotspots_3d anchors.
 *
 * AF-04: the engine is resolved by resolveAnatomyEngine() — the legacy
 * 200-unit scene.html by default, or the real-world Human Atlas bundle when
 * the (owner-gated) flag + URL are configured. All wire encoding goes through
 * atlas-bridge so this component never branches on the engine inline.
 */

export default function PinPlacement3DTab({ gender }: { gender: "female" | "male" }) {
  const engine = useMemo(() => resolveAnatomyEngine(), []);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [placement, setPlacement] = useState(false);
  const [regionKey, setRegionKey] = useState<string>("");
  const [bodyPartId, setBodyPartId] = useState<string>("");
  const [captured, setCaptured] = useState<{ x: number; y: number; z: number; region: string | null } | null>(null);
  // AF-04: skin render mode driven into the Atlas over the bridge. Only the
  // Atlas engine implements it; the legacy scene ignores the intent.
  const [skinMode, setSkinMode] = useState<"opaque" | "glass" | "hidden">("opaque");

  const { data: regionsData } = useAnatomyRegions3D();
  const regions = regionsData?.regions ?? [];
  const { data: partsData } = useBodyParts("all");
  const parts = useMemo(
    () => [...(partsData?.parts ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [partsData],
  );
  const { data: hotspotsData } = useHotspots3D(regionKey || undefined);
  const hotspots = hotspotsData?.hotspots ?? [];
  const upsert = useUpsertHotspot3D();
  const remove = useDeleteHotspot3D();

  const send = useCallback(
    (intent: EditorIntent) => {
      iframeRef.current?.contentWindow?.postMessage(
        encodeIntent(intent, engine.engine),
        "*",
      );
    },
    [engine.engine],
  );

  // Scene → editor messages (normalised across both engines by the bridge).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = decodeInbound(event.data);
      if (msg.type === "ready") {
        setSceneReady(true);
      } else if (msg.type === "placement") {
        setCaptured({
          x: msg.x ?? 0,
          y: msg.y ?? 0,
          z: msg.z ?? 0,
          region: msg.region ?? null,
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Init scene once ready; keep gender + pin preview in sync.
  useEffect(() => {
    if (!sceneReady) return;
    send({ type: "init", sex: gender, placement });
  }, [sceneReady, gender, placement, send]);

  useEffect(() => {
    if (!sceneReady) return;
    send({
      type: "set_pins",
      pins: hotspots.map((h) => ({
        id: h.id,
        body_part_id: h.body_part_id,
        x: Number(h.x),
        y: Number(h.y),
        z: Number(h.z),
      })),
    });
  }, [sceneReady, hotspots, send]);

  useEffect(() => {
    if (!sceneReady) return;
    if (regionKey) {
      const preset = regions.find((r) => r.key === regionKey);
      if (preset) {
        send({
          type: "focus_region",
          key: preset.key,
          x: preset.target_x,
          y: preset.target_y,
          z: preset.target_z,
          zoom: preset.zoom,
          yaw: preset.default_yaw,
        });
      }
    } else {
      send({ type: "reset_view" });
    }
  }, [sceneReady, regionKey, regions, send]);

  const savePin = () => {
    if (!bodyPartId || !captured) return;
    const region = regionKey || captured.region || "chest";
    upsert.mutate(
      {
        body_part_id: bodyPartId,
        region_key: region,
        gender: "shared",
        x: captured.x,
        y: captured.y,
        z: captured.z,
      },
      { onSuccess: () => setCaptured(null) },
    );
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Viewer */}
      <div className="card p-5 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-heading">
            📍 3D Pin Placement {regionKey ? `— ${regionKey}` : "— full body"}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="btn btn-sm btn-secondary"
              value={regionKey}
              onChange={(e) => setRegionKey(e.target.value)}
            >
              <option value="">Full body view</option>
              {regions.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
            <div
              className="flex items-center gap-1 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
              role="group"
              aria-label="Skin render mode"
            >
              {(["opaque", "glass", "hidden"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`btn btn-sm ${skinMode === m ? "btn-primary" : "btn-secondary"}`}
                  disabled={engine.engine !== "atlas"}
                  title={
                    engine.engine !== "atlas"
                      ? "Skin / Glass modes require the Human Atlas engine"
                      : `Skin render: ${m}`
                  }
                  onClick={() => {
                    setSkinMode(m);
                    send({ type: "set_skin_mode", mode: m });
                  }}
                >
                  {m === "opaque" ? "Opaque" : m === "glass" ? "Glass" : "Hidden"}
                </button>
              ))}
            </div>
            <button
              className={`btn btn-sm ${placement ? "btn-primary" : "btn-secondary"}`}
              onClick={() => {
                setPlacement((v) => !v);
                send({ type: "set_placement", on: !placement });
              }}
            >
              {placement ? "🎯 Placement ON — tap model" : "Enable placement"}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-inner">
          <iframe
            ref={iframeRef}
            src={engine.iframeSrc}
            title="Anatomy 3D pin placement editor"
            className="aspect-[16/10] max-h-[70vh] w-full"
          />
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span className="badge badge-blue shrink-0">{engine.label}</span>
          {engine.engine === "atlas"
            ? "Pins are resolved from Atlas geometry (real-world metres) — see the Atlas Crosswalk tab."
            : "Drag to rotate. With placement enabled, tap the model to capture model-space coordinates for the selected body part."}
        </p>
        {engine.misconfigured && (
          <div className="alert al-wa mt-2">
            <div className="al-ic">⚠️</div>
            <div className="flex-1 text-xs">
              <strong>Atlas enabled but not configured.</strong> Set{" "}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 font-mono">
                NEXT_PUBLIC_ANATOMY_ATLAS_URL
              </code>{" "}
              to the built Atlas bundle URL. Falling back to the legacy scene
              until then.
            </div>
          </div>
        )}
      </div>

      {/* Controls + pin list */}
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
            Place a pin
          </p>
          <select
            className="btn btn-sm btn-secondary mt-2 w-full"
            value={bodyPartId}
            onChange={(e) => setBodyPartId(e.target.value)}
          >
            <option value="">Select body part…</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.body_system ? ` (${p.body_system})` : ""}
              </option>
            ))}
          </select>

          {captured ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/15 p-3">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                Captured: x={captured.x}, y={captured.y}, z={captured.z}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Detected region: {captured.region ?? "—"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="btn btn-sm btn-primary"
                  disabled={!bodyPartId || upsert.isPending}
                  onClick={savePin}
                >
                  {upsert.isPending ? "Saving…" : "Save pin"}
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setCaptured(null)}
                >
                  Discard
                </button>
              </div>
              {!bodyPartId && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Select a body part above to enable saving.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">
              No capture yet — enable placement and tap the model.
            </p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
              Pins {regionKey ? `in ${regionKey}` : "(all)"}
            </p>
            <span className="badge badge-blue">{hotspots.length}</span>
          </div>
          <ul className="mt-2 max-h-[300px] space-y-1.5 overflow-y-auto">
            {hotspots.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {h.body_parts?.name ?? h.body_part_id}
                  </p>
                  <p className="text-2xs text-slate-400">
                    {h.region_key} · {h.gender} · ({Number(h.x).toFixed(1)},{" "}
                    {Number(h.y).toFixed(1)}, {Number(h.z).toFixed(1)}) ·{" "}
                    {h.source}
                  </p>
                </div>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => remove.mutate(h.id)}
                  disabled={remove.isPending}
                >
                  Remove
                </button>
              </li>
            ))}
            {hotspots.length === 0 && (
              <li className="py-4 text-center text-xs text-slate-400">
                No 3D pins yet.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
