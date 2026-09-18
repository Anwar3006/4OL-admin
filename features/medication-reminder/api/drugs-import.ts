import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { DRUG_AVAILABILITY, DRUG_CATEGORIES, DRUG_STATUSES } from "@/lib/shared-constants";
import { getObviousNonDrugReason } from "@/features/medication-reminder/data/drug-catalog-validation";

/**
 * Bulk drug import (Gap Analysis B.5/B.12). The client parses the CSV and
 * applies the D1/D2/D3 normalization (lib/drug-import-mapping.ts); this
 * route persists the normalized rows in one transactional batch and writes
 * drug_import_batches bookkeeping.
 */

const ImportRowSchema = z.object({
  name: z.string().trim().min(2).max(240),
  generic_name: z.string().trim().max(240).nullable().optional(),
  slug: z.string().trim().min(2).max(240),
  category: z.enum(DRUG_CATEGORIES).nullable().optional(),
  availability: z.enum(DRUG_AVAILABILITY).default("unknown"),
  dosage_form: z.string().trim().max(80).nullable().optional(),
  strength: z.string().trim().max(60).nullable().optional(),
  strength_unit: z.string().trim().max(20).nullable().optional(),
  pack_size: z.number().int().positive().max(100000).nullable().optional(),
  manufacturer: z.string().trim().max(160).nullable().optional(),
  active_ingredients: z.array(z.string().max(160)).max(40).default([]),
  status: z.enum(DRUG_STATUSES).default("active"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  aliases: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
});

const ImportPayloadSchema = z.object({
  fileName: z.string().trim().min(1).max(320),
  /** Normalized import rows; the client chunks large files into calls of ≤ 1000. */
  rows: z.array(ImportRowSchema).min(1).max(1000),
  skipped: z.number().int().min(0).default(0),
  totalInFile: z.number().int().min(0).default(0),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ImportPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { fileName, rows, skipped, totalInFile } = parsed.data;
  const rejectedNonDrugs = rows
    .map((row) => ({
      name: row.name,
      reason: getObviousNonDrugReason({
        name: row.name,
        genericName: row.generic_name,
        classificationReason:
          typeof row.metadata.classification_reason === "string"
            ? row.metadata.classification_reason
            : null,
      }),
    }))
    .filter((row): row is { name: string; reason: string } => Boolean(row.reason));

  if (rejectedNonDrugs.length > 0) {
    return NextResponse.json(
      {
        error: "Import contains non-drug products.",
        rejected: rejectedNonDrugs.slice(0, 20),
      },
      { status: 422 },
    );
  }

  const { data: batch, error: batchError } = await admin
    .from("drug_import_batches")
    .insert({
      file_name: fileName,
      uploaded_by: auth.user.id,
      total_rows: totalInFile || rows.length,
      status: "processing",
    })
    .select()
    .single();

  if (batchError || !batch) {
    console.error("[medication/drugs/import] batch create error:", batchError?.message);
    return NextResponse.json({ error: "Failed to start import batch." }, { status: 500 });
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errorLog: { row: string; error: string }[] = [];

  // Upsert by slug (names are unique in the source file; slug is derived
  // deterministically from generic+strength+form by the mapping layer).
  const { error: upsertError } = await admin.from("drugs").upsert(
    rows.map((row) => ({
      name: row.name,
      generic_name: row.generic_name ?? null,
      slug: row.slug,
      category: row.category ?? null,
      availability: row.availability,
      dosage_form: row.dosage_form ?? null,
      strength: row.strength ?? null,
      strength_unit: row.strength_unit ?? null,
      pack_size: row.pack_size ?? null,
      manufacturer: row.manufacturer ?? null,
      active_ingredients: row.active_ingredients,
      status: row.status,
      source: "excel_import",
      metadata: row.metadata,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "slug", ignoreDuplicates: false },
  );

  if (upsertError) {
    console.error("[medication/drugs/import] upsert error:", upsertError.message);
    // Fall back to row-by-row so a single bad row doesn't sink the batch.
    for (const row of rows) {
      const { error } = await admin.from("drugs").upsert(
        {
          name: row.name,
          generic_name: row.generic_name ?? null,
          slug: row.slug,
          category: row.category ?? null,
          availability: row.availability,
          dosage_form: row.dosage_form ?? null,
          strength: row.strength ?? null,
          strength_unit: row.strength_unit ?? null,
          pack_size: row.pack_size ?? null,
          manufacturer: row.manufacturer ?? null,
          active_ingredients: row.active_ingredients,
          status: row.status,
          source: "excel_import",
          metadata: row.metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      );
      if (error) {
        failed += 1;
        errorLog.push({ row: row.name, error: error.message });
      } else {
        inserted += 1;
      }
    }
  } else {
    inserted = rows.length;
  }

  // Seed brand aliases ("Brand word: X" reasons from the classifier).
  const aliasRows: { drug_id: string; alias: string; alias_type: string }[] = [];
  for (const row of rows) {
    if (!row.aliases.length) continue;
    const { data: drug } = await admin
      .from("drugs")
      .select("id")
      .eq("slug", row.slug)
      .maybeSingle();
    if (!drug) continue;
    for (const alias of row.aliases) {
      aliasRows.push({ drug_id: drug.id, alias, alias_type: "brand" });
    }
  }
  if (aliasRows.length) {
    await admin.from("drug_aliases").upsert(aliasRows, {
      onConflict: "alias",
      ignoreDuplicates: true,
    });
  }

  await admin
    .from("drug_import_batches")
    .update({
      inserted,
      updated,
      skipped_duplicates: skipped,
      failed,
      status: failed > inserted ? "failed" : "completed",
      error_log: errorLog.slice(0, 100),
    })
    .eq("id", batch.id);

  return NextResponse.json({
    batchId: batch.id,
    inserted,
    updated,
    failed,
    skipped,
    errors: errorLog.slice(0, 20),
  });
}
