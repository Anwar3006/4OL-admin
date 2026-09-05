/**
 * The shapes the Anatomy feature reads and writes.
 *
 * These are the row and response types the admin UI renders. They were
 * interleaved with the react-query hooks in data/useAnatomy.ts, which made
 * the data layer read as 800 lines of mixed concerns; separating them is the
 * point of the `schema/` slot in this module layout.
 *
 * They are hand-written and describe what the API routes and RPCs actually
 * return today — they are NOT generated from the database, so they can drift.
 * Generating them is E5.2.
 *
 * Several of these correspond to mobile-contract RPCs
 * (get_anatomy_body_part_bundle, get_anatomy_region_content and the rest, see
 * tests/contract/mobile-contract.ts). Adding an optional field here is safe;
 * removing or renaming one means a field disappeared from a payload the Expo
 * app also reads.
 */

export interface AnatomyOverviewStats {
  body_parts_mapped: number;
  condition_links: number;
  symptom_links: number;
  map_interactions_30d: number;
  healthy_tip_links: number;
  hotspots: number;
}

export interface AnatomyBodyPart {
  id: string;
  name: string;
  parent_id: string | null;
  mesh_id: string | null;
  path: string;
  level: number | null;
  body_system: string;
  gender_scope?: string | null;
  icon?: string | null;
  description?: string | null;
  display_order?: number | null;
  symptom_count: number;
  condition_count: number;
}

export interface AnatomyHotspot {
  id: string;
  body_part_id: string;
  gender: "female" | "male" | "shared";
  view: "front" | "back";
  body_system: string | null;
  svg_path_id: string | null;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  is_organ: boolean;
}

export interface AnatomyConditionRow {
  condition_id: string;
  condition_name: string;
  icd11_code: string | null;
  severity: string | null;
  specialist: string | null;
  status: string | null;
  body_part_id: string;
  body_part_name: string;
}

export interface AnatomySymptomRow {
  symptom_id: string;
  symptom_name: string;
  severity: string | null;
  is_systemic: boolean | null;
  body_part_id: string;
  body_part_name: string;
}

export interface AnatomyTipRow {
  tip_id: string;
  tip_name: string;
  slug: string | null;
  description: string | null;
  status: string | null;
  body_part_id: string;
  body_part_name: string;
  body_system: string | null;
  source: string | null;
}

export interface AnatomyDrugLinkRow {
  body_part_id: string;
  body_part_name: string;
  body_system: string | null;
  drug_id: string;
  drug_name: string;
  generic_name: string | null;
  category: string | null;
  availability: string | null;
  dosage_form: string | null;
  strength: string | null;
  strength_unit: string | null;
  status: string | null;
}

export interface AnatomyExerciseLinkRow {
  body_part_id: string;
  body_part_name: string;
  body_system: string | null;
  workout_id: string;
  exercise_name: string;
  category: string | null;
  primary_muscle_group: string | null;
  secondary_muscles: string | null;
  difficulty_level: string | null;
  equipment_required: string | null;
  tier: string | null;
  status: string | null;
  is_active: boolean | null;
  source: string | null;
}

export interface AnatomyLinkPage<T> {
  links: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  hasMore: boolean;
}

export interface AnatomyRegion3D {
  key: string;
  label: string;
  target_x: number;
  target_y: number;
  target_z: number;
  zoom: number;
  default_yaw: number;
  display_order: number;
}

export interface Hotspot3D {
  id: string;
  body_part_id: string;
  region_key: string;
  gender: "female" | "male" | "shared";
  x: number;
  y: number;
  z: number;
  source: string;
  body_parts?: { id: string; name: string; body_system: string | null } | null;
}

export interface AiMappingRow {
  id: string;
  content_type: "condition" | "symptom" | "tip" | "workout" | "drug";
  content_id: string;
  content_name: string;
  confidence: number;
  rationale: string | null;
  status: "proposed" | "approved" | "rejected";
  model: string | null;
  created_at: string;
  body_parts?: { id: string; name: string } | null;
}

export interface AnatomyPremiumLayers {
  organs: boolean;
  tours: boolean;
  quiz: boolean;
}

export interface AnatomyPremiumConfigResponse {
  layers: AnatomyPremiumLayers;
  regions: { key: string; label: string; is_premium: boolean }[];
  applied: boolean;
}
