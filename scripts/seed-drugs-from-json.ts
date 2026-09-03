import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

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
} from "../lib/drug-import-mapping";
import { getSupabaseAdmin } from "../lib/supabase-admin";

type PillsJsonRow = {
  original_name?: unknown;
  generic_name?: unknown;
  category?: unknown;
  availability?: unknown;
};

type SeedRow = NormalizedDrugRow & {
  original_name: string;
};

const DEFAULT_SOURCE_FILE = path.join(
  process.cwd(),
  "PILLS LIST_FINAL_MEDICATIONS.json",
);
const BATCH_SIZE = 500;
const READ_PAGE_SIZE = 1000;

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

function normalizeRows(records: PillsJsonRow[], sourceFileName: string): SeedRow[] {
  const rows: SeedRow[] = [];

  for (const record of records) {
    const originalName = String(record.original_name ?? "").trim();
    if (originalName.length < 2) continue;

    const rawCategory = String(record.category ?? "");
    const { category, needsReview } = collapseCategory(rawCategory);
    const genericRaw = String(record.generic_name ?? "").trim();
    const genericName = genericRaw || null;
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
        original_name: originalName,
        original_category: rawCategory || null,
        original_availability: String(record.availability ?? "").trim() || null,
        ...(needsReview ? { needs_category_review: true } : {}),
      },
      aliases: [],
    });
  }

  return rows;
}

function summarize(rows: SeedRow[]) {
  const byAvailability = new Map<string, number>();
  const byStatus = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const slugCounts = new Map<string, number>();

  for (const row of rows) {
    byAvailability.set(row.availability, (byAvailability.get(row.availability) ?? 0) + 1);
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
    byCategory.set(row.category ?? "Uncategorised", (byCategory.get(row.category ?? "Uncategorised") ?? 0) + 1);
    slugCounts.set(row.slug, (slugCounts.get(row.slug) ?? 0) + 1);
  }

  return {
    total: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    underReview: rows.filter((row) => row.status === "under_review").length,
    availability: Object.fromEntries([...byAvailability.entries()].sort()),
    status: Object.fromEntries([...byStatus.entries()].sort()),
    categories: Object.fromEntries([...byCategory.entries()].sort()),
    duplicateSlugCount: [...slugCounts.values()].filter((count) => count > 1).length,
  };
}

async function seed() {
  const sourcePath = getArgValue("--file") ?? DEFAULT_SOURCE_FILE;
  const shouldWrite = process.argv.includes("--write");
  const resolvedPath = path.resolve(sourcePath);
  const fileName = path.basename(resolvedPath);

  const raw = fs.readFileSync(resolvedPath, "utf8");
  const parsed = JSON.parse(raw) as PillsJsonRow[];
  if (!Array.isArray(parsed)) {
    throw new Error("Expected the source JSON to contain an array of drug rows.");
  }

  const rows = normalizeRows(parsed, fileName);
  const summary = summarize(rows);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.duplicateSlugCount > 0) {
    throw new Error(`Refusing to continue: ${summary.duplicateSlugCount} duplicate slug groups found.`);
  }

  if (!shouldWrite) {
    console.log("Dry run only. Re-run with --write to seed Supabase.");
    return;
  }

  const client = getSupabaseAdmin();
  const existingSlugs = new Set<string>();
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

  const { data: batch, error: batchError } = await client
    .from("drug_import_batches")
    .insert({
      file_name: fileName,
      total_rows: parsed.length,
      inserted: 0,
      updated: 0,
      skipped_duplicates: parsed.length - rows.length,
      failed: 0,
      status: "processing",
      error_log: [],
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

  console.log(`Seed complete. Batch ${batch.id}: ${inserted} inserted, ${updated} updated.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
