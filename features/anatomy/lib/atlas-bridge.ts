/**
 * AF-04 — postMessage bridge between the pin editor and either render engine.
 *
 * The editor speaks in *intents* (set the sex, show these pins, focus a
 * region, toggle placement). Each engine has its own wire protocol:
 *
 *   legacy (`scene.html`)      — init / set_gender / set_pins / zoom_region /
 *                                set_placement / reset_view. Pins are in the
 *                                hand-authored 200-unit space (feet y=0,
 *                                head y=200).
 *
 *   atlas (built bundle)       — set_sex / set_pins / fit_bounds /
 *                                select_by_fma / set_visible_systems /
 *                                set_placement. Pins are in real-world metres,
 *                                Y-up, resolved from anatomy_atlas_pins.
 *
 * The bridge encodes one intent into the right payload so PinPlacement3DTab
 * never branches on the engine inline. Incoming messages (ready / placement /
 * selected) are normalised the same way.
 *
 * NOTE (owner hard stop): the Atlas bundle must implement the `atlas` protocol
 * below and post `{type:"ready"}` once its viewer mounts. Until the bundle is
 * built + hosted, the flag stays off and only the legacy encoder runs.
 */

import type { AnatomyEngine } from "./atlas-engine";

/** A pin the editor wants rendered. Coordinates are engine-native. */
export interface BridgePin {
  id?: string | number;
  body_part_id?: string;
  /** FMA concept id — the Atlas join key (legacy ignores it). */
  concept_id?: string | null;
  name?: string;
  x: number;
  y: number;
  z: number;
}

export type EditorIntent =
  | { type: "init"; sex: "male" | "female"; placement: boolean }
  | { type: "set_sex"; sex: "male" | "female" }
  | { type: "set_pins"; pins: BridgePin[] }
  | { type: "set_placement"; on: boolean }
  | { type: "set_skin_mode"; mode: "opaque" | "glass" | "hidden" }
  | {
      type: "focus_region";
      key?: string;
      x?: number;
      y?: number;
      z?: number;
      zoom?: number;
      yaw?: number;
    }
  | { type: "reset_view" };

/** Encode an editor intent into the JSON string the target engine expects. */
export function encodeIntent(
  intent: EditorIntent,
  engine: AnatomyEngine,
): string {
  const payload =
    engine === "atlas"
      ? encodeAtlas(intent)
      : encodeLegacy(intent);
  return JSON.stringify(payload);
}

function encodeLegacy(intent: EditorIntent): Record<string, unknown> {
  switch (intent.type) {
    case "init":
      // Legacy scene uses `gender`; it also seeds placement mode.
      return { type: "init", gender: intent.sex, placement: intent.placement };
    case "set_sex":
      return { type: "set_gender", gender: intent.sex };
    case "set_pins":
      return {
        type: "set_pins",
        pins: intent.pins.map((p) => ({
          id: p.id,
          body_part_id: p.body_part_id,
          x: p.x,
          y: p.y,
          z: p.z,
        })),
      };
    case "set_placement":
      return { type: "set_placement", on: intent.on };
    case "set_skin_mode":
      // Legacy scene.html has no skin/glass render modes; it ignores unknown
      // message types, so the passthrough is harmless and keeps the encoder
      // total (no unhandled union member).
      return { type: "set_skin_mode", mode: intent.mode };
    case "focus_region":
      // No key → the legacy scene treats a bare reset as "full body".
      if (!intent.key) return { type: "reset_view" };
      return {
        type: "zoom_region",
        key: intent.key,
        x: intent.x,
        y: intent.y,
        z: intent.z,
        zoom: intent.zoom,
        yaw: intent.yaw,
      };
    case "reset_view":
      return { type: "reset_view" };
  }
}

function encodeAtlas(intent: EditorIntent): Record<string, unknown> {
  switch (intent.type) {
    case "init":
      return { type: "set_sex", sex: intent.sex, placement: intent.placement };
    case "set_sex":
      return { type: "set_sex", sex: intent.sex };
    case "set_pins":
      // Atlas pins carry the FMA concept so the viewer can highlight the mesh.
      return {
        type: "set_pins",
        space: "metres",
        pins: intent.pins.map((p) => ({
          id: p.id,
          body_part_id: p.body_part_id,
          concept_id: p.concept_id ?? null,
          name: p.name,
          x: p.x,
          y: p.y,
          z: p.z,
        })),
      };
    case "set_placement":
      return { type: "set_placement", on: intent.on };
    case "set_skin_mode":
      // Atlas-side skin/glass render mode (host-bridge.ts set_skin_mode).
      return { type: "set_skin_mode", mode: intent.mode };
    case "focus_region":
      if (!intent.key) return { type: "fit_bounds", target: "full" };
      // Atlas has no 200-unit region presets; fit the camera to the point.
      return {
        type: "fit_bounds",
        target: "point",
        x: intent.x,
        y: intent.y,
        z: intent.z,
        zoom: intent.zoom,
        yaw: intent.yaw,
      };
    case "reset_view":
      return { type: "fit_bounds", target: "full" };
  }
}

/** Normalised inbound message from either engine. */
export interface BridgeInbound {
  type: "ready" | "placement" | "selected" | "unknown";
  x?: number;
  y?: number;
  z?: number;
  region?: string | null;
  conceptId?: string | null;
  bodyPartId?: string | null;
}

/**
 * Parse a raw postMessage payload (both engines post JSON strings) into the
 * normalised inbound shape. Unknown/invalid payloads collapse to `unknown`
 * rather than throwing — the editor listens on `window` and will see messages
 * from other frames.
 */
export function decodeInbound(raw: unknown): BridgeInbound {
  if (typeof raw !== "string") return { type: "unknown" };
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { type: "unknown" };
  }

  const type = msg.type;
  if (type === "ready") return { type: "ready" };

  if (type === "placement" || type === "pin_placed") {
    return {
      type: "placement",
      x: num(msg.x),
      y: num(msg.y),
      z: num(msg.z),
      region: (msg.region as string | null) ?? null,
      conceptId: (msg.conceptId as string | null) ?? (msg.concept_id as string | null) ?? null,
    };
  }

  if (type === "selected") {
    return {
      type: "selected",
      conceptId: (msg.conceptId as string | null) ?? (msg.concept_id as string | null) ?? null,
      bodyPartId: (msg.bodyPartId as string | null) ?? (msg.body_part_id as string | null) ?? null,
    };
  }

  return { type: "unknown" };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
