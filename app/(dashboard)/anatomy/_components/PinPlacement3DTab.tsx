"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useBodyParts,
  useAnatomyRegions3D,
  useHotspots3D,
  useUpsertHotspot3D,
  useDeleteHotspot3D,
} from "@/hooks/supabase-calls/useAnatomy";

/**
 * 3D Pin Placement editor (Gap Analysis Part AL, AL-D3). Embeds the same
 * scene engine the mobile app renders (public/anatomy/scene.html) inside an
 * iframe. In placement mode a tap on the model unprojects to model-space
 * coordinates, which are saved as anatomy_hotspots_3d anchors.
 */

interface PlacementMsg {
  type: string;
  x?: number;
  y?: number;
  z?: number;
  region?: string | null;
  part?: string | null;
}

export default function PinPlacement3DTab({ gender }: { gender: "female" | "male" }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [placement, setPlacement] = useState(false);
  const [regionKey, setRegionKey] = useState<string>("");
  const [bodyPartId, setBodyPartId] = useState<string>("");
  const [captured, setCaptured] = useState<{ x: number; y: number; z: number; region: string | null } | null>(null);

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

  const send = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), "*");
  }, []);

  // Scene → editor messages.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== "string") return;
      let msg: PlacementMsg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
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
    send({ type: "init", gender, placement });
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
          type: "zoom_region",
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
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
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

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <iframe
            ref={iframeRef}
            src="/anatomy/scene.html"
            title="Anatomy 3D pin placement editor"
            className="h-[480px] w-full"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Drag to rotate. With placement enabled, tap the model to capture
          model-space coordinates for the selected body part. The same scene
          engine ships inside the mobile app.
        </p>
      </div>

      {/* Controls + pin list */}
      <div className="space-y-4">
        <div className="card p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold text-emerald-800">
                Captured: x={captured.x}, y={captured.y}, z={captured.z}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
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
                <p className="mt-2 text-[11px] text-amber-600">
                  Select a body part above to enable saving.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-400">
              No capture yet — enable placement and tap the model.
            </p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Pins {regionKey ? `in ${regionKey}` : "(all)"}
            </p>
            <span className="badge badge-blue">{hotspots.length}</span>
          </div>
          <ul className="mt-2 max-h-[300px] space-y-1.5 overflow-y-auto">
            {hotspots.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    {h.body_parts?.name ?? h.body_part_id}
                  </p>
                  <p className="text-[10px] text-slate-400">
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
