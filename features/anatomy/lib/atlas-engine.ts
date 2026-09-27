/**
 * AF-04 — Anatomy render-engine resolution (feature-flagged, reversible).
 *
 * The Anatomy pin editor has historically embedded the legacy 200-unit
 * `public/anatomy/scene.html` engine in an iframe and driven it over a
 * postMessage bridge. AF-04 swaps that engine for the real-world Human Atlas
 * (male BodyParts3D 4.0 + partial female HuBMAP HRA v1.5) — but ONLY behind a
 * flag, because:
 *
 *   1. The Atlas is a separate Vite/React 19/Three.js bundle that must be
 *      built (`vite build`) and hosted at a static URL. That build + host is
 *      an owner task; until it exists there is nothing to point the iframe at.
 *   2. Pins move from the hand-authored 200-unit scene space to Atlas metre
 *      space (Y-up), resolved from `anatomy_atlas_pins` rather than tapped.
 *
 * So this module resolves which engine the editor should mount. With the flag
 * off (the default) nothing changes: the legacy scene.html is used and every
 * existing behaviour is preserved. Flip it on — and only once an Atlas bundle
 * URL is configured — to embed the Atlas instead.
 *
 * Env:
 *   NEXT_PUBLIC_ANATOMY_ATLAS_ENABLED  "true" to opt into the Atlas engine
 *   NEXT_PUBLIC_ANATOMY_ATLAS_URL      absolute base URL of the built bundle
 */

export type AnatomyEngine = "legacy" | "atlas";

export interface AnatomyEngineConfig {
  engine: AnatomyEngine;
  /** Legacy: the in-repo scene. Atlas: the configured bundle base URL. */
  iframeSrc: string;
  /** Human label surfaced in the editor chrome so an admin knows which engine is live. */
  label: string;
  /** True when the Atlas flag is on but no bundle URL is configured (misconfig). */
  misconfigured: boolean;
}

const LEGACY_SCENE_SRC = "/anatomy/scene.html";

function readFlag(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

/**
 * Resolve the active anatomy engine. Pure + side-effect free so it can be
 * called during render and in tests.
 */
export function resolveAnatomyEngine(
  env: NodeJS.ProcessEnv = process.env,
): AnatomyEngineConfig {
  const enabled = readFlag(env.NEXT_PUBLIC_ANATOMY_ATLAS_ENABLED);
  const url = (env.NEXT_PUBLIC_ANATOMY_ATLAS_URL || "").trim();

  if (!enabled) {
    return {
      engine: "legacy",
      iframeSrc: LEGACY_SCENE_SRC,
      label: "Legacy scene (200-unit)",
      misconfigured: false,
    };
  }

  if (!url) {
    // Flag on but nothing to load — stay on legacy rather than render a blank
    // iframe, and surface the misconfiguration to the editor.
    return {
      engine: "legacy",
      iframeSrc: LEGACY_SCENE_SRC,
      label: "Legacy scene (Atlas enabled but no URL configured)",
      misconfigured: true,
    };
  }

  return {
    engine: "atlas",
    iframeSrc: url,
    label: "Human Atlas (real-world metres)",
    misconfigured: false,
  };
}
