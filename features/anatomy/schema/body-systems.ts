/**
 * The body systems a body part can belong to. One list, imported by both the
 * UI and the API.
 *
 * It used to live in `ui/AddBodyPartDialog.tsx`, and `api/body-map.ts` kept a
 * hand-copied subset in its zod enum — five of these nine, missing `general`,
 * `digestive`, `muscular`, `urinary` and `reproductive`. A server module
 * cannot sensibly import a constant out of a dialog component, so the copy was
 * inevitable and so was the drift.
 *
 * The consequence was not subtle: the Body Map tab defaults its filter to
 * `general`, so `GET /api/anatomy/body-map?bodySystem=general` returned
 * **400 Invalid query parameters** on first paint. `general` is also the value
 * the route's own `inferSystem()` falls back to — the endpoint rejected a
 * value it produces itself. Five of the nine filter options were dead.
 *
 * Keeping this in `schema/` is the point of the slot: it is the vocabulary
 * both halves of the feature agree on, owned by neither.
 */
export const BODY_SYSTEMS = [
  "general",
  "cardiovascular",
  "digestive",
  "respiratory",
  "nervous",
  "skeletal",
  "muscular",
  "urinary",
  "reproductive",
] as const;

export type BodySystem = (typeof BODY_SYSTEMS)[number];

/** The filter vocabulary: every system, plus the "no filter" sentinel. */
export const BODY_SYSTEM_FILTERS = ["all", ...BODY_SYSTEMS] as const;

export type BodySystemFilter = (typeof BODY_SYSTEM_FILTERS)[number];
