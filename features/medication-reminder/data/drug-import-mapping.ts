/**
 * Drug CSV import mapping (Gap Analysis B.12).
 *
 * Source: PILLS LIST_FINAL_classified.csv — pharmacy inventory list enriched
 * by a medication classifier. Columns A–E + G matter; H+ (sales forecasts)
 * are ignored. This module turns raw CSV rows into normalized `drugs`
 * payloads the `/api/medication/drugs/import` route can persist.
 *
 * Resolved decisions:
 *  - D1: collapse the 138 CSV categories into the 9 mockup buckets.
 *  - D2: exclude TRUE rows flagged "Non-med indicator" (FMCG/personal care).
 *  - D3: availability "Unknown" stored as 'unknown'.
 *  - D4: autocomplete serves `active` only; `under_review` is admin-only.
 */

import { getObviousNonDrugReason } from "./drug-catalog-validation";

export type DrugAvailability = "otc" | "rx_only" | "controlled" | "unknown";
export type DrugStatus = "active" | "discontinued" | "under_review" | "unverified";

export interface NormalizedDrugRow {
  name: string;
  generic_name: string | null;
  slug: string;
  category: string | null;
  availability: DrugAvailability;
  dosage_form: string | null;
  strength: string | null;
  strength_unit: string | null;
  pack_size: number | null;
  manufacturer: string | null;
  active_ingredients: string[];
  status: DrugStatus;
  metadata: Record<string, unknown>;
  aliases: string[];
}

export interface ImportParseResult {
  rows: NormalizedDrugRow[];
  skippedNotMedication: number;
  skippedNonMed: number;
  totalInFile: number;
}

// ── D1: 138 CSV categories → 9 stored buckets ──────────────────────────────

const CATEGORY_MAP: Record<string, string> = {
  // Antibiotics
  antibiotic: "Antibiotics",
  "ophthalmic antibiotic": "Antibiotics",
  "otic antibiotic": "Antibiotics",
  "topical antibiotic": "Antibiotics",
  antiparasitic: "Antibiotics",
  // Antihypertensives & Cardiovascular
  antihypertensive: "Antihypertensives & Cardiovascular",
  "beta blocker": "Antihypertensives & Cardiovascular",
  "calcium channel blocker": "Antihypertensives & Cardiovascular",
  "ace inhibitor": "Antihypertensives & Cardiovascular",
  arb: "Antihypertensives & Cardiovascular",
  diuretic: "Antihypertensives & Cardiovascular",
  "alpha blocker": "Antihypertensives & Cardiovascular",
  statin: "Antihypertensives & Cardiovascular",
  antihyperlipidemic: "Antihypertensives & Cardiovascular",
  anticoagulant: "Antihypertensives & Cardiovascular",
  antiplatelet: "Antihypertensives & Cardiovascular",
  antiarrhythmic: "Antihypertensives & Cardiovascular",
  "anti-anginal": "Antihypertensives & Cardiovascular",
  "cardiac glycoside": "Antihypertensives & Cardiovascular",
  venotonic: "Antihypertensives & Cardiovascular",
  "peripheral vasodilator": "Antihypertensives & Cardiovascular",
  inotropic: "Antihypertensives & Cardiovascular",
  "bile acid sequestrant": "Antihypertensives & Cardiovascular",
  // Antimalarials
  antimalarial: "Antimalarials",
  // Analgesics
  analgesic: "Analgesics",
  "topical analgesic": "Analgesics",
  antimigraine: "Analgesics",
  antigout: "Analgesics",
  antirheumatic: "Analgesics",
  "biologic dmard": "Analgesics",
  // Antiretrovirals (flagged for review — not all antivirals are ARVs)
  antiviral: "Antiretrovirals",
  // Antidiabetics
  antidiabetic: "Antidiabetics",
  // Antifungals
  antifungal: "Antifungals",
  // Vitamins & Supplements
  vitamin: "Vitamins & Supplements",
  supplement: "Vitamins & Supplements",
  "mineral supplement": "Vitamins & Supplements",
  "herbal supplement": "Vitamins & Supplements",
  "nutritional supplement": "Vitamins & Supplements",
  multivitamin: "Vitamins & Supplements",
  nutritional: "Vitamins & Supplements",
  probiotic: "Vitamins & Supplements",
  electrolyte: "Vitamins & Supplements",
  antioxidant: "Vitamins & Supplements",
  "vitamin d analog": "Vitamins & Supplements",
  "herbal medicine": "Vitamins & Supplements",
};

export function collapseCategory(raw: string): {
  category: string | null;
  needsReview: boolean;
} {
  const key = raw.trim().toLowerCase();
  if (!key || key === "unknown" || key === "unknown - review") {
    return { category: "Other", needsReview: true };
  }
  const bucket = CATEGORY_MAP[key];
  if (!bucket) return { category: "Other", needsReview: false };
  return { category: bucket, needsReview: key === "antiviral" };
}

// ── Dosage form token map (B.12 derived-field rules) ───────────────────────

const FORM_TOKENS: [RegExp, string][] = [
  [/\bEFF\b/i, "effervescent tablet"],
  [/\bCAPS\b|\bCAP\b/i, "capsule"],
  [/\bTABS?\b/i, "tablet"],
  [/\bSYR\b|\bSYRUP\b/i, "syrup"],
  [/\bSUSP\b/i, "suspension"],
  [/\bINJ\b|\bAMP\b|\bAMPS\b|\bVIAL\b/i, "injection"],
  [/\bDROPS?\b/i, "drops"],
  [/\bINHALER\b/i, "inhaler"],
  [/\bCREAM\b|\bOINT\b|\bGEL\b|\bLOTION\b/i, "topical"],
  [/\bSACHET\b|\bPOWDER\b|\bPWD\b/i, "powder"],
  [/\bSPRAY\b/i, "spray"],
];

export function extractDosageForm(name: string): string | null {
  for (const [pattern, form] of FORM_TOKENS) {
    if (pattern.test(name)) return form;
  }
  return null;
}

// ── Strength + unit: "500MG" → ("500", "mg"); combos like 50/1000MG kept ──

const STRENGTH_RE = /(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?)\s*(MCG|MG|ML|IU|%|G)\b/i;

export function extractStrength(name: string): {
  strength: string | null;
  strength_unit: string | null;
} {
  const match = name.match(STRENGTH_RE);
  if (!match) return { strength: null, strength_unit: null };
  return {
    strength: match[1],
    strength_unit: match[2].toLowerCase(),
  };
}

// ── Pack size: "100'S" → 100 ───────────────────────────────────────────────

export function extractPackSize(name: string): number | null {
  const match = name.match(/(\d+)\s*'S\b/i);
  return match ? Number(match[1]) : null;
}

// ── Manufacturer hint: parenthetical suffix like "(INTAS)" ─────────────────

export function extractManufacturer(name: string): string | null {
  const match = name.match(/\(([A-Z][A-Z0-9 &.-]{1,40})\)\s*$/);
  return match ? match[1].trim() : null;
}

// ── Slug: lowercase generic + strength + form (collision-safe) ─────────────

export function deriveSlug(
  genericName: string | null,
  strength: string | null,
  dosageForm: string | null,
  fallbackName: string,
): string {
  const base = genericName?.trim() || fallbackName;
  const parts = [base, strength, dosageForm]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return parts || fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// ── Title case for display names ───────────────────────────────────────────

export function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((word) =>
      word.length <= 2 && /^[a-z]{1,2}$/.test(word)
        ? word.toUpperCase() // MG, ML, IU stay uppercase
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

// ── Brand alias extraction: reason "Brand word: galvusmet" ─────────────────

export function extractBrandAliases(reason: string): string[] {
  const aliases: string[] = [];
  const matches = reason.matchAll(/brand word:\s*([a-z0-9/-]+)/gi);
  for (const m of matches) {
    const alias = m[1].trim();
    if (alias) aliases.push(alias);
  }
  return aliases;
}

// ── Quality tier (drives `status`): clean ≥ 0.88 → active; ≤ 0.65 or ───────
// Unknown* category → under_review.

export function assignStatus(
  confidence: number | null,
  rawCategory: string,
): DrugStatus {
  const catKey = rawCategory.trim().toLowerCase();
  const unknownCategory = catKey.startsWith("unknown");
  if (unknownCategory || (confidence !== null && confidence <= 0.65)) {
    return "under_review";
  }
  return "active";
}

// ── Raw CSV record shape (header-driven) ───────────────────────────────────

export interface PillsCsvRow {
  original_name?: string;
  is_medication?: string;
  generic_name?: string;
  category?: string;
  availability?: string;
  confidence?: string | number;
  reason?: string;
  [key: string]: string | number | undefined;
}

function normalizeAvailability(raw: string): DrugAvailability {
  const key = raw.trim().toLowerCase();
  if (key === "otc") return "otc";
  if (key === "rx only" || key === "rx_only" || key === "rx") return "rx_only";
  if (key === "controlled") return "controlled";
  return "unknown";
}

/**
 * Core B.12 pipeline steps 2–4: filter TRUE rows, drop entries classified or
 * recognized as non-medications, normalize + derive fields, assign tiers.
 */
export function normalizePillsRows(
  records: PillsCsvRow[],
  sourceFileName: string,
): ImportParseResult {
  const rows: NormalizedDrugRow[] = [];
  let skippedNotMedication = 0;
  let skippedNonMed = 0;

  for (const record of records) {
    const name = (record.original_name || "").trim();
    if (!name) continue;

    const isMed = String(record.is_medication ?? "").trim().toLowerCase();
    if (isMed !== "true") {
      skippedNotMedication += 1;
      continue;
    }

    const reason = String(record.reason ?? "");
    const nonDrugReason = getObviousNonDrugReason({
      name,
      genericName: record.generic_name,
      classificationReason: reason,
    });
    if (nonDrugReason) {
      skippedNonMed += 1;
      continue;
    }

    const rawCategory = String(record.category ?? "");
    const { category, needsReview } = collapseCategory(rawCategory);
    const genericRaw = (record.generic_name || "").trim();
    const genericName = genericRaw || null;
    const activeIngredients = genericRaw
      ? genericRaw.split("/").map((s) => s.trim()).filter(Boolean)
      : [];

    const dosageForm = extractDosageForm(name);
    const { strength, strength_unit } = extractStrength(name);
    const confidence =
      record.confidence !== undefined && record.confidence !== ""
        ? Number(record.confidence)
        : null;

    rows.push({
      name: titleCase(name),
      generic_name: genericName,
      slug: deriveSlug(genericName, strength, dosageForm, name),
      category,
      availability: normalizeAvailability(String(record.availability ?? "")),
      dosage_form: dosageForm,
      strength,
      strength_unit,
      pack_size: extractPackSize(name),
      manufacturer: extractManufacturer(name),
      active_ingredients: activeIngredients,
      status: assignStatus(Number.isNaN(confidence as number) ? null : confidence, rawCategory),
      metadata: {
        confidence: Number.isNaN(confidence as number) ? null : confidence,
        classification_reason: reason || null,
        category_original: rawCategory || null,
        source_file: sourceFileName,
        ...(needsReview ? { needs_category_review: true } : {}),
      },
      aliases: extractBrandAliases(reason),
    });
  }

  return { rows, skippedNotMedication, skippedNonMed, totalInFile: records.length };
}

// ── Minimal RFC-4180 CSV parser (quoted fields, embedded commas/newlines) ──

export function parseCsv(text: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  // Strip BOM (source file is utf-8-sig).
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0].trim() !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.length > 1 || row[0].trim() !== "") rows.push(row);
  }

  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((header, idx) => {
      rec[header] = cells[idx] ?? "";
    });
    return rec;
  });

  return { headers, records };
}

/** Split normalized rows into import chunks of ≤ 500 (B.12 step 5). */
export function chunkRows<T>(rows: T[], size = 500): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}
