import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import {
  collapseCategory,
  extractDosageForm,
  extractManufacturer,
  extractPackSize,
  extractStrength,
  titleCase,
  type DrugAvailability,
  type DrugStatus,
  type NormalizedDrugRow,
} from "../features/medication-reminder/data/drug-import-mapping";
import { getObviousNonDrugReason } from "../features/medication-reminder/data/drug-catalog-validation";
import { supabaseServiceKey, supabaseUrl } from "../lib/db/env";

type PillsJsonRow = {
  original_name?: unknown;
  generic_name?: unknown;
  category?: unknown;
  availability?: unknown;
};

type SeedRow = NormalizedDrugRow & {
  original_name: string;
};

type RejectedSeedRow = {
  original_name: string;
  generic_name: string | null;
  category: string | null;
  reason: string;
};

type NormalizeResult = {
  rows: SeedRow[];
  rejected: RejectedSeedRow[];
  skippedInvalid: number;
  totalInFile: number;
};

const DEFAULT_SOURCE_FILE = path.join(
  process.cwd(),
  "scripts/seed-data/PILLS LIST_FINAL_MEDICATIONS.json",
);
const BATCH_SIZE = 500;
const READ_PAGE_SIZE = 1000;

const NON_DRUG_GENERIC_EXACT = new Set([
  "adidas",
  "air freshener",
  "baby lotion",
  "body spray",
  "dog food",
  "mouth freshener",
  "old spice",
  "toothpaste",
  "toy",
  "toys",
]);

const HARD_NON_DRUG_NAME_PATTERNS: [RegExp, string][] = [
  [/\b(toy|toys)\b/i, "toy"],
  [/\b(police\s+(car|hero)|fashion\s+girl|racing\s+\d|superior\s+(racing|force)|despicable\s+me)\b/i, "toy"],
  [/\b(lamborghini|dorae\s+mon|vehicle\s+roll)\b/i, "toy"],
  [/\b(cadbury|dairy\s+milk)\b/i, "food"],
  [/\bdog\s+food\b/i, "pet food"],
  [/\bair\s+wick\b|\brefreshner\b|\brefresher\b|\bscented\s+candles?\b/i, "air freshener"],
];

const PERSONAL_CARE_NAME_PATTERNS: [RegExp, string][] = [
  [/\b(adidas|old\s+spice|palmolive|rexona|lynx|nivea|jergens|cantu|dove|batiste)\b/i, "personal care brand"],
  [/\bdr\.?\s*(rashel|rachel|darvey|davey)\b/i, "cosmetic skincare"],
  [/\b(shower\s+(gel|cream|milk)|bath\s+foam|body\s+(spray|wash|lotion)|deo\s+(spray|stick)|deodorant|hand\s+wash|shave\s+cream)\b/i, "personal care product"],
  [/\b(whitening\s+soap|cleansing\s+milk|facial\s+foam|skin\s+whitening|fairness)\b/i, "cosmetic skincare"],
  [/\b(aquafresh|tooth\s+powder|toothpaste)\b/i, "oral care product"],
];

const THERAPEUTIC_NAME_OR_GENERIC_PATTERNS = [
  /\b(ketoconazole|clotrimazole|miconazole|hydrocortisone|benzoyl\s+peroxide|antiseptic|chlorhexidine|calamine)\b/i,
  /\b(anti-?lice|anti-?acne|tooth\s*ache|toothache|nasal|saline|inhaler|nebul|wound|burn|fungal)\b/i,
];

const PRODUCT_DESCRIPTION_PATTERNS = [
  /\b(shampoo|conditioner|body\s+wash|shower|deodorant|freshener|candle|dog\s+food|toy|toys|car|cream\s+soap)\b/i,
  /\b\d+\s*(ml|g|kg)\b/i,
];

const MEDICINE_SIGNAL_PATTERNS = [
  /\b(tabs?|tablets?|caps?|capsules?|syr|syrup|susp|suspension|inj|injection|amp|amps|vial|drops?|inhaler|nebules?)\b/i,
  /\b(cream|oint|ointment|gel|lotion|spray|powder|sachet|solution|suppository|pessary|patch)\b/i,
  /\b\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?\s*(mcg|mg|iu|%)\b/i,
];

function getArgValue(name: string): string | null {
  const prefix = `${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function normalizeAvailability(raw: unknown): DrugAvailability {
  const key = String(raw ?? "").trim().toLowerCase();
  if (key === "otc") return "otc";
  if (key === "rx only" || key === "rx_only" || key === "rx") return "rx_only";
  if (key === "controlled") return "controlled";
  return "unknown";
}

function splitIngredients(genericName: string | null): string[] {
  if (!genericName) return [];
  return genericName
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stableSlug(originalName: string): string {
  const base = slugify(originalName).slice(0, 220) || "drug";
  const hash = crypto
    .createHash("sha1")
    .update(originalName.trim().toLowerCase())
    .digest("hex")
    .slice(0, 8);
  return `${base}-${hash}`;
}

function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

function createAdminClient() {
  return createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function isUnknownCategory(rawCategory: string): boolean {
  const key = rawCategory.trim().toLowerCase();
  return !key || key === "unknown" || key === "unknown - review" || key.startsWith("unknown");
}

function isProductDescription(raw: string): boolean {
  return PRODUCT_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(raw));
}

function hasTherapeuticSignal(raw: string): boolean {
  return THERAPEUTIC_NAME_OR_GENERIC_PATTERNS.some((pattern) => pattern.test(raw));
}

function hasMedicineSignal(raw: string): boolean {
  return MEDICINE_SIGNAL_PATTERNS.some((pattern) => pattern.test(raw));
}

function classifyRejectedRow(originalName: string, genericName: string | null, rawCategory: string): string | null {
  const genericKey = (genericName ?? "").trim().toLowerCase();
  const combined = `${originalName} ${genericName ?? ""} ${rawCategory}`;

  const obviousNonDrugReason = getObviousNonDrugReason({
    name: originalName,
    genericName,
  });
  if (obviousNonDrugReason) return obviousNonDrugReason;

  if (NON_DRUG_GENERIC_EXACT.has(genericKey)) {
    return `non-drug generic: ${genericKey}`;
  }

  for (const [pattern, reason] of HARD_NON_DRUG_NAME_PATTERNS) {
    if (pattern.test(combined)) return reason;
  }

  const therapeuticSignal = hasTherapeuticSignal(combined);
  for (const [pattern, reason] of PERSONAL_CARE_NAME_PATTERNS) {
    if (pattern.test(combined) && !therapeuticSignal) return reason;
  }

  const categoryUnknown = isUnknownCategory(rawCategory);
  const genericLooksLikeProduct =
    !genericKey ||
    genericKey === "unknown" ||
    genericKey === originalName.trim().toLowerCase() ||
    isProductDescription(genericKey);

  if (categoryUnknown && genericLooksLikeProduct && !hasMedicineSignal(combined) && !therapeuticSignal) {
    return "unknown category without medicine signal";
  }

  return null;
}

function normalizeRows(records: PillsJsonRow[], sourceFileName: string): NormalizeResult {
  const rows: SeedRow[] = [];
  const rejected: RejectedSeedRow[] = [];
  let skippedInvalid = 0;

  for (const record of records) {
    const originalName = String(record.original_name ?? "").trim();
    if (originalName.length < 2) {
      skippedInvalid += 1;
      continue;
    }

    const rawCategory = String(record.category ?? "");
    const { category, needsReview } = collapseCategory(rawCategory);
    const genericRaw = String(record.generic_name ?? "").trim();
    const genericName = genericRaw || null;
    const rejectionReason = classifyRejectedRow(originalName, genericName, rawCategory);
    if (rejectionReason) {
      rejected.push({
        original_name: originalName,
        generic_name: genericName,
        category: rawCategory || null,
        reason: rejectionReason,
      });
      continue;
    }

    const dosageForm = extractDosageForm(originalName);
    const { strength, strength_unit } = extractStrength(originalName);
    const status: DrugStatus =
      rawCategory.trim().toLowerCase().startsWith("unknown")
        ? "under_review"
        : "active";

    rows.push({
      original_name: originalName,
      name: titleCase(originalName),
      generic_name: genericName,
      slug: stableSlug(originalName),
      category,
      availability: normalizeAvailability(record.availability),
      dosage_form: dosageForm,
      strength,
      strength_unit,
      pack_size: extractPackSize(originalName),
      manufacturer: extractManufacturer(originalName),
      active_ingredients: splitIngredients(genericName),
      status,
      metadata: {
        source_file: sourceFileName,
        source_format: "json",
        cleansed: true,
        original_name: originalName,
        original_category: rawCategory || null,
        original_availability: String(record.availability ?? "").trim() || null,
        ...(needsReview ? { needs_category_review: true } : {}),
      },
      aliases: [],
    });
  }

  return {
    rows,
    rejected,
    skippedInvalid,
    totalInFile: records.length,
  };
}

function summarize(result: NormalizeResult) {
  const { rows, rejected } = result;
  const byAvailability = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const slugCounts = new Map<string, number>();
  const rejectReasons = new Map<string, number>();

  for (const row of rows) {
    byAvailability.set(row.availability, (byAvailability.get(row.availability) ?? 0) + 1);
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    byCategory.set(row.category ?? "Uncategorised", (byCategory.get(row.category ?? "Uncategorised") ?? 0) + 1);
    slugCounts.set(row.slug, (slugCounts.get(row.slug) ?? 0) + 1);
  }

  for (const row of rejected) {
    rejectReasons.set(row.reason, (rejectReasons.get(row.reason) ?? 0) + 1);
  }

  return {
    totalInFile: result.totalInFile,
    normalized: rows.length,
    rejected: rejected.length,
    skippedInvalid: result.skippedInvalid,
    active: rows.filter((row) => row.status === "active").length,
    underReview: rows.filter((row) => row.status === "under_review").length,
    availability: Object.fromEntries([...byAvailability.entries()].sort()),
    status: Object.fromEntries([...byStatus.entries()].sort()),
    categories: Object.fromEntries([...byCategory.entries()].sort()),
    rejectReasons: Object.fromEntries([...rejectReasons.entries()].sort((a, b) => b[1] - a[1])),
    rejectExamples: rejected.slice(0, 25),
    duplicateSlugCount: [...slugCounts.values()].filter((count) => count > 1).length,
  };
}

async function detachDrugReferences(client: ReturnType<typeof createAdminClient>) {
  const detachments = [
    { table: "medication_enquiries", column: "drug_id" },
    { table: "medication_reminders", column: "drug_id" },
    { table: "drug_verification_requests", column: "matched_drug_id" },
  ];

  for (const item of detachments) {
    const { error } = await client
      .from(item.table)
      .update({ [item.column]: null })
      .not(item.column, "is", null);
    if (error) throw error;
  }

  const { error: interactionError } = await client
    .from("drug_interactions")
    .delete()
    .not("id", "is", null);
  if (interactionError) throw interactionError;
}

async function clearDrugs(client: ReturnType<typeof createAdminClient>) {
  await detachDrugReferences(client);

  const { count, error } = await client
    .from("drugs")
    .delete({ count: "exact" })
    .not("id", "is", null);
  if (error) throw error;

  return count ?? 0;
}

async function seed() {
  const sourcePath = getArgValue("--file") ?? DEFAULT_SOURCE_FILE;
  const shouldWrite = process.argv.includes("--write");
  const shouldReplace = process.argv.includes("--replace");
  const rejectsPath = getArgValue("--rejects");
  const resolvedPath = path.resolve(sourcePath);
  const fileName = path.basename(resolvedPath);

  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw) as PillsJsonRow[];
  if (!Array.isArray(parsed)) {
    throw new Error("Expected the source JSON to contain an array of drug rows.");
  }

  const result = normalizeRows(parsed, fileName);
  const rows = result.rows;
  const summary = summarize(result);
  console.log(JSON.stringify(summary, null, 2));

  if (rejectsPath) {
    const resolvedRejectsPath = path.resolve(rejectsPath);
    fs.mkdirSync(path.dirname(resolvedRejectsPath), { recursive: true });
    fs.writeFileSync(
      resolvedRejectsPath,
      `${JSON.stringify({
        generated_at: new Date().toISOString(),
        source_file: fileName,
        total_in_file: result.totalInFile,
        normalized: rows.length,
        rejected: result.rejected.length,
        rows: result.rejected,
      }, null, 2)}\n`,
      "utf8",
    );
    console.log(`Reject report written to ${resolvedRejectsPath}`);
  }

  if (summary.duplicateSlugCount > 0) {
    throw new Error(`Refusing to continue: ${summary.duplicateSlugCount} duplicate slug groups found.`);
  }

  if (!shouldWrite) {
    console.log("Dry run only. Re-run with --write to seed Supabase.");
    return;
  }

  const client = createAdminClient();
  let deleted = 0;
  if (shouldReplace) {
    deleted = await clearDrugs(client);
    console.log(`Replace mode: deleted ${deleted} existing drug row(s).`);
  }

  const existingSlugs = new Set<string>();
  if (!shouldReplace) {
    for (let offset = 0; ; offset += READ_PAGE_SIZE) {
      const { data, error } = await client
        .from("drugs")
        .select("slug")
        .order("slug", { ascending: true })
        .range(offset, offset + READ_PAGE_SIZE - 1);
      if (error) throw error;
      for (const row of data ?? []) existingSlugs.add(row.slug);
      if (!data || data.length < READ_PAGE_SIZE) break;
    }
  }

  const { data: batch, error: batchError } = await client
    .from("drug_import_batches")
    .insert({
      file_name: fileName,
      total_rows: parsed.length,
      inserted: 0,
      updated: 0,
      skipped_duplicates: result.rejected.length + result.skippedInvalid,
      failed: 0,
      status: "processing",
      error_log: result.rejected.slice(0, 100).map((row) => ({
        row: row.original_name,
        error: row.reason,
      })),
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    throw batchError ?? new Error("Failed to create drug import batch.");
  }

  let imported = 0;
  const errors: { row: string; error: string }[] = [];
  for (const [index, chunk] of chunkRows(rows, BATCH_SIZE).entries()) {
    const payload = chunk.map((row) => ({
      name: row.name,
      generic_name: row.generic_name,
      slug: row.slug,
      category: row.category,
      availability: row.availability,
      dosage_form: row.dosage_form,
      strength: row.strength,
      strength_unit: row.strength_unit,
      pack_size: row.pack_size,
      manufacturer: row.manufacturer,
      active_ingredients: row.active_ingredients,
      conditions_treated: [],
      status: row.status,
      source: "excel_import",
      metadata: row.metadata,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client
      .from("drugs")
      .upsert(payload, { onConflict: "slug", ignoreDuplicates: false });

    if (error) {
      errors.push({ row: `chunk ${index + 1}`, error: error.message });
      console.error(`Chunk ${index + 1} failed: ${error.message}`);
      continue;
    }

    imported += chunk.length;
    console.log(`Imported chunk ${index + 1}/${Math.ceil(rows.length / BATCH_SIZE)}`);
  }

  const inserted = rows.filter((row) => !existingSlugs.has(row.slug)).length;
  const updated = rows.length - inserted;
  const failed = errors.length;

  await client
    .from("drug_import_batches")
    .update({
      inserted: failed ? Math.min(inserted, imported) : inserted,
      updated: failed ? Math.max(imported - inserted, 0) : updated,
      failed,
      status: failed ? "failed" : "completed",
      error_log: errors.slice(0, 100),
    })
    .eq("id", batch.id);

  if (failed) {
    throw new Error(`Seed finished with ${failed} failed chunk(s). See drug_import_batches ${batch.id}.`);
  }

  console.log(
    `Seed complete. Batch ${batch.id}: ${inserted} inserted, ${updated} updated, ${result.rejected.length} rejected, ${deleted} deleted.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
