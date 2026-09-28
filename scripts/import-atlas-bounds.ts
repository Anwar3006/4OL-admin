/**
 * import-atlas-bounds.ts — AF-04 crosswalk import harness.
 *
 * Bulk-loads the Human Atlas geometry (part bounding boxes, keyed by FMA
 * concept) into public.atlas_part_bounds via the load_atlas_bounds RPC, and
 * registers each loaded atlas in public.atlas_models. Once bounds are loaded
 * and body_part <-> FMA mappings are confirmed (Atlas Crosswalk admin tab),
 * recompute_anatomy_atlas_pins derives pin anchors from the geometry.
 *
 * This is a maintenance script, not a migration: it writes real reference
 * data but is idempotent (ON CONFLICT upserts) and re-runnable.
 *
 *   npx tsx scripts/import-atlas-bounds.ts
 *   npx tsx scripts/import-atlas-bounds.ts <maleAtlas.json> <femaleAtlas.json>
 *   npx tsx scripts/import-atlas-bounds.ts --coverage-only
 *
 * Requires .env.local (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY) — same
 * as every other script in this directory. Writes need the service role
 * because load_atlas_bounds / recompute are SECURITY DEFINER and gated to
 * service_role or app admins.
 *
 * HARD STOP: this script is NOT auto-run. Applying it mutates the shared
 * Supabase project, which is an owner action. Run it manually once the AF-04
 * migration is applied and you have confirmed the target project.
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import * as fs from "fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Defaults ────────────────────────────────────────────────────────────────
// The dual male+female Atlas bundle lives in the human-atlas-mf worktree. Both
// paths are overridable via CLI args so the harness works against a freshly
// built/hosted bundle too.
const MONOREPO = path.resolve(process.cwd(), "..");
const ATLAS_DIR = path.join(
  MONOREPO,
  "Human Anatomy - 3D",
  "work",
  "human-atlas-mf",
  "public",
  "models",
);
const DEFAULT_MALE = path.join(ATLAS_DIR, "atlas.json");
const DEFAULT_FEMALE = path.join(ATLAS_DIR, "atlas-female.json");

const ATTRIBUTION =
  "BodyParts3D 4.0 / HuBMAP Human Reference Atlas v1.5 — CC BY 4.0. " +
  "In-app attribution required.";

const CHUNK_SIZE = 400; // keep each RPC payload well under the request limit

interface AtlasPart {
  id: string;
  conceptId: string;
  system?: string | null;
  bounds: [[number, number, number], [number, number, number]];
}

interface AtlasJson {
  version: string;
  sex: "male" | "female";
  source?: string;
  scope?: string;
  concepts?: unknown;
  parts: AtlasPart[];
}

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (.env.local).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function conceptCount(a: AtlasJson): number {
  const c = a.concepts;
  if (Array.isArray(c)) return c.length;
  if (c && typeof c === "object") return Object.keys(c).length;
  return new Set(a.parts.map((p) => p.conceptId)).size;
}

async function registerModel(admin: SupabaseClient, a: AtlasJson) {
  const { error } = await admin.from("atlas_models").upsert(
    {
      version: a.version,
      sex: a.sex,
      source: a.source ?? null,
      scope: a.scope ?? null,
      attribution: ATTRIBUTION,
      part_count: a.parts.length,
      concept_count: conceptCount(a),
      is_active: true,
      loaded_at: new Date().toISOString(),
    },
    { onConflict: "version,sex" },
  );
  if (error) throw new Error(`atlas_models upsert failed: ${error.message}`);
  console.log(`  ✓ registered atlas_models (${a.sex} · ${a.version})`);
}

async function loadBounds(admin: SupabaseClient, a: AtlasJson) {
  const total = a.parts.length;
  let upserted = 0;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const batch = a.parts.slice(i, i + CHUNK_SIZE).map((p) => ({
      id: p.id,
      conceptId: p.conceptId,
      system: p.system ?? null,
      bounds: p.bounds,
    }));
    const { data, error } = await admin.rpc("load_atlas_bounds", {
      p_atlas_version: a.version,
      p_sex: a.sex,
      p_parts: batch,
    });
    if (error) {
      throw new Error(
        `load_atlas_bounds failed at offset ${i}: ${error.message}. ` +
          `Is the AF-04 migration applied?`,
      );
    }
    upserted += (data as { upserted?: number })?.upserted ?? batch.length;
    process.stdout.write(
      `\r  … bounds ${Math.min(i + CHUNK_SIZE, total)}/${total}`,
    );
  }
  console.log(`\n  ✓ upserted ${upserted} atlas_part_bounds rows (${a.sex})`);
}

async function importFile(admin: SupabaseClient, file: string) {
  if (!fs.existsSync(file)) {
    console.warn(`  ! skipping — file not found: ${file}`);
    return;
  }
  console.log(`\n▶ ${path.basename(file)}`);
  const raw = fs.readFileSync(file, "utf8");
  const atlas = JSON.parse(raw) as AtlasJson;
  if (!atlas.parts || !Array.isArray(atlas.parts)) {
    throw new Error(`${file} has no parts[] array — wrong atlas JSON?`);
  }
  await registerModel(admin, atlas);
  await loadBounds(admin, atlas);
}

async function printCoverage(admin: SupabaseClient) {
  const { data, error } = await admin.rpc("get_atlas_crosswalk_coverage");
  if (error) {
    console.warn(`\n! coverage report failed: ${error.message}`);
    return;
  }
  const cov = data as {
    total_body_parts: number;
    by_sex: Array<{
      sex: string;
      mapped_body_parts: number;
      confirmed_mappings: number;
      proposed_mappings: number;
      resolved_pins: number;
      atlas_concepts: number;
    }>;
  };
  console.log(`\n══ Crosswalk coverage ══`);
  console.log(`Total curated body parts: ${cov.total_body_parts}`);
  for (const s of cov.by_sex ?? []) {
    console.log(
      `  ${s.sex.padEnd(7)} mapped ${String(s.mapped_body_parts).padStart(4)} ` +
        `· confirmed ${String(s.confirmed_mappings).padStart(4)} ` +
        `· proposed ${String(s.proposed_mappings).padStart(4)} ` +
        `· pins ${String(s.resolved_pins).padStart(4)} ` +
        `· atlas concepts ${String(s.atlas_concepts).padStart(5)}`,
    );
  }
  console.log(
    `\nNext: confirm body_part↔FMA mappings in the admin Atlas Crosswalk tab, ` +
      `then Recompute pins (or run recompute_anatomy_atlas_pins per sex).`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const admin = getAdminClient();

  if (args.includes("--coverage-only")) {
    await printCoverage(admin);
    return;
  }

  const positional = args.filter((a) => !a.startsWith("--"));
  const maleFile = positional[0] ?? DEFAULT_MALE;
  const femaleFile = positional[1] ?? DEFAULT_FEMALE;

  console.log("AF-04 Atlas bounds import");
  console.log(`  male   : ${maleFile}`);
  console.log(`  female : ${femaleFile}`);

  await importFile(admin, maleFile);
  await importFile(admin, femaleFile);
  await printCoverage(admin);
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("\n✖", err instanceof Error ? err.message : err);
  process.exit(1);
});
