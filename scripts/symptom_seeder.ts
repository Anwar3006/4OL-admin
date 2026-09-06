import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { getSupabaseAdmin } from "../lib/supabase-admin";

// Load .env.local configuration
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

/**
 * Mapping object that links symptom names to their related body parts.
 * Add or expand this list as needed to cover your entire symptoms dictionary.
 */
const symptomMapping: Record<string, { bodyParts: string[] }> = {
  "Acid and chemical burns": {
    bodyParts: ["Skin", "Skull and Face"],
  },
  "Swollen glands": {
    bodyParts: ["Head and Neck", "Immune and Lymphatic"],
  },
  "Testicular lumps and swellings": {
    bodyParts: ["Reproductive Organs"],
  },
  "Thigh problems": {
    // "Upper Leg and Hip" doesn't exist as a single node in body_parts —
    // the closest real coverage is the two adjacent nodes below.
    bodyParts: ["Thigh (Femur)", "Hip and Pelvic Girdle"],
  },
  "Tick bites": {
    bodyParts: ["Skin"],
  },
  Toothache: {
    // "Mouth and Teeth" doesn't exist in body_parts; "Mouth and Jaw" is the
    // real row that covers dental/oral symptoms.
    bodyParts: ["Skull and Face", "Mouth and Jaw"],
  },
  "Urinary incontinence": {
    bodyParts: ["Bladder and Urinary Tract"],
  },
  "Urinary tract infection (UTI)": {
    bodyParts: ["Bladder and Urinary Tract"],
  },
  "Vaginal discharge": {
    bodyParts: ["Reproductive Organs"],
  },
};

/**
 * Body parts referenced above that have no corresponding system in
 * body_parts at all (no Integumentary/Skin, Reproductive, or Urinary
 * top-level branch exists in the current hierarchy). These are seeded as
 * new top-level nodes (level 0, no parent) before symptom associations are
 * built, mirroring existing top-level rows like "Immune and Lymphatic" and
 * "Digestive and Metabolic". Upserted on `name` (already UNIQUE on
 * body_parts), so reruns won't create duplicates.
 */
const missingBodyPartsToSeed = [
  { name: "Skin", mesh_id: "sys_skin", path: "Skin", level: 0 },
  {
    name: "Reproductive Organs",
    mesh_id: "sys_reproductive",
    path: "ReproductiveOrgans",
    level: 0,
  },
  {
    name: "Bladder and Urinary Tract",
    mesh_id: "sys_urinary",
    path: "BladderandUrinaryTract",
    level: 0,
  },
];

// Case-insensitive lookup so a symptom name that differs only in casing
// from a symptomMapping key still resolves (previously a silent miss).
const symptomMappingLower = new Map<
  string,
  (typeof symptomMapping)[keyof typeof symptomMapping]
>();
Object.entries(symptomMapping).forEach(([name, value]) => {
  symptomMappingLower.set(name.toLowerCase(), value as any);
});
function getBodyParts(symptomName: string) {
  return symptomMappingLower.get(symptomName.toLowerCase());
}

// Helper function to chunk array for batch inserts
function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function seedSymptoms() {
  console.log("⏳ Starting symptoms seeder process...");

  try {
    const client = getSupabaseAdmin();
    const seedDataPath = path.join(
      process.cwd(),
      "scripts/seed-data/nhs_symptoms_seed.json",
    );
    if (!fs.existsSync(seedDataPath)) {
      console.error("❌ Missing seed_data.json");
      process.exit(1);
    }
    const seedData = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));

    console.log("🧹 Wiping existing symptoms and associations...");

    // Clear junction tables first to avoid foreign key violations
    const { count: catCount } = await client
      .from("symptom_categories")
      .select("id", { count: "exact", head: true });
    const { count: bpCount } = await client
      .from("symptom_body_parts")
      .select("id", { count: "exact", head: true });
    console.log(
      `   Found ${catCount ?? 0} symptom_categories rows, ${bpCount ?? 0} symptom_body_parts rows referencing symptoms.`,
    );

    await client
      .from("symptom_body_parts")
      .delete()
      .neq("symptom_id", "00000000-0000-0000-0000-000000000000");
    await client
      .from("symptom_categories")
      .delete()
      .neq("symptom_id", "00000000-0000-0000-0000-000000000000");
    await client
      .from("symptoms")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    console.log("📦 Fetching categories and body parts for lookup...");
    const { data: allCategories } = await client.from("categories").select("*");
    const { data: allBodyParts } = await client.from("body_parts").select("*");

    const categoryMap = new Map();
    allCategories?.forEach((c: any) => categoryMap.set(c.slug, c.id));

    const bodyPartNameMap = new Map();
    const bodyPartPathMap = new Map();
    allBodyParts?.forEach((bp: any) => {
      bodyPartNameMap.set(bp.name.toLowerCase(), bp);
      bodyPartPathMap.set(bp.path, bp.id);
    });

    const categoriesSeed = seedData.categories_seed || [];
    const symptomsSeed = seedData.symptoms_seed || [];

    console.log(`🩺 Seeding ${categoriesSeed.length} symptom categories...`);

    // 1. Seed Categories (Type: symptom)
    if (categoriesSeed.length > 0) {
      const formattedCategories = categoriesSeed.map((cat: any) => ({
        name: cat.name,
        slug: cat.slug,
        path: cat.path,
        type: cat.type || "symptom",
      }));

      const { error: catUpsertErr } = await client
        .from("categories")
        .upsert(formattedCategories, { onConflict: "slug,type" });

      if (catUpsertErr) {
        console.error("❌ Error upserting categories:", catUpsertErr);
        process.exit(1);
      }
      console.log("✅ Categories synchronized.");
    }

    // Re-fetch categories after upsert to ensure we have all IDs
    const { data: dbCategories, error: fetchCatErr } = await client
      .from("categories")
      .select("id, slug")
      .eq("type", "symptom");

    if (fetchCatErr || !dbCategories) {
      console.error("❌ Error fetching categories from DB:", fetchCatErr);
      process.exit(1);
    }
    const categoryIdMap = new Map<string, string>(
      dbCategories.map((c) => [c.slug, c.id]),
    );

    console.log(
      `🩺 Syncing ${missingBodyPartsToSeed.length} missing body part(s) (Skin, Reproductive, Urinary)...`,
    );
    const { error: bpUpsertErr } = await client
      .from("body_parts")
      .upsert(missingBodyPartsToSeed, { onConflict: "name" });

    if (bpUpsertErr) {
      console.error("❌ Error upserting missing body parts:", bpUpsertErr);
      process.exit(1);
    }

    const { data: dbBodyParts, error: fetchBPErr } = await client
      .from("body_parts")
      .select("id, name");

    if (fetchBPErr || !dbBodyParts) {
      console.error("❌ Error fetching body parts from DB:", fetchBPErr);
      process.exit(1);
    }
    const bodyPartMap = new Map<string, string>(
      dbBodyParts.map((b) => [b.name.toLowerCase(), b.id]),
    );

    console.log(`🩺 Seeding ${symptomsSeed.length} symptoms...`);

    const batchSize = 50;
    const symptomBatches = chunkArray(symptomsSeed, batchSize);

    // Track misses so incompleteness is visible instead of silent.
    const symptomsWithoutMapping = new Set<string>();
    const unmatchedCategorySlugs = new Set<string>();
    const unmatchedBodyPartNames = new Set<string>();
    let failedBatches = 0;

    for (let i = 0; i < symptomBatches.length; i++) {
      const batch = symptomBatches[i];

      // Format primary symptom payload
      const symptomPayload = batch.map((s: any) => ({
        name: s.name || s.title,
        slug:
          s.slug ||
          (s.name || s.title).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        nhs_link: s.nhs_link || null,
        image_url: s.image_url || null,
        specialist: s.specialist || null,
        status: s.status || "published",
        is_systemic: s.is_systemic || false,
        about: s.about || null,
        diagnosis: s.diagnosis || null,
        treatment: s.treatment || null,
        complications: s.complications || null,
        prevention: s.prevention || null,
        contact_your_doctor: s.contact_your_doctor || null,
        more_information: s.more_information || null,
        attribution: s.attribution || null,
        metadata: s.metadata || {},
      }));

      // Upsert primary symptoms rows
      const { data: insertedSymptoms, error: symptomErr } = await client
        .from("symptoms")
        .upsert(symptomPayload, { onConflict: "slug" })
        .select("id, slug, name");

      if (symptomErr || !insertedSymptoms) {
        console.error(`❌ Error inserting symptom batch ${i + 1}:`, symptomErr);
        failedBatches++;
        continue;
      }

      // Map inserted/updated rows to their generated database IDs
      const insertedSymptomMap = new Map<string, string>(
        insertedSymptoms.map((s) => [s.slug, s.id]),
      );

      const catAssocs: any[] = [];
      const bodyPartAssocs: any[] = [];

      // Construct relational records for the junction tables
      for (const symptom of batch as any[]) {
        const symptomName = symptom.name || symptom.title;
        const symptomSlug =
          symptom.slug || symptomName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const symptomId = insertedSymptomMap.get(symptomSlug);

        if (!symptomId) continue;

        // Handle Category Associations
        const catSlug =
          symptom.category_association_slug || symptom.category_slug;
        if (catSlug) {
          const catId = categoryIdMap.get(catSlug);
          if (catId) {
            catAssocs.push({ symptom_id: symptomId, category_id: catId });
          } else {
            unmatchedCategorySlugs.add(catSlug);
          }
        }

        // Handle Body Part Associations via mapping configuration
        const mapping = getBodyParts(symptomName);
        if (mapping && mapping.bodyParts) {
          for (const bpName of mapping.bodyParts) {
            const bpId = bodyPartMap.get(bpName.toLowerCase());
            if (bpId) {
              bodyPartAssocs.push({
                symptom_id: symptomId,
                body_part_id: bpId,
              });
            } else {
              unmatchedBodyPartNames.add(bpName);
            }
          }
        } else {
          symptomsWithoutMapping.add(symptomName);
        }
      }

      // Upsert relational data into junction tables
      if (catAssocs.length > 0) {
        const { error: catAssocErr } = await client
          .from("symptom_categories")
          .upsert(catAssocs, { onConflict: "category_id,symptom_id" });
        if (catAssocErr) {
          console.error(
            "❌ Error inserting category associations:",
            catAssocErr,
          );
        }
      }

      if (bodyPartAssocs.length > 0) {
        const { error: bpAssocErr } = await client
          .from("symptom_body_parts")
          .upsert(bodyPartAssocs, { onConflict: "body_part_id,symptom_id" });
        if (bpAssocErr) {
          console.error(
            "❌ Error inserting body part associations:",
            bpAssocErr,
          );
        }
      }

      console.log(`✅ Processed batch ${i + 1} of ${symptomBatches.length}`);
    }

    if (failedBatches > 0) {
      console.error(
        `❌ Seeding finished with ${failedBatches} failed batch(es) out of ${symptomBatches.length}. See errors above.`,
      );
    } else {
      console.log("🎉 Seeding completed successfully!");
    }

    // Output logging telemetry corresponding exactly to disease logs
    if (symptomsWithoutMapping.size > 0) {
      console.warn(
        `⚠️  ${symptomsWithoutMapping.size} symptom(s) had no entry in symptomMapping (no body parts assigned):`,
      );
      console.warn("   " + [...symptomsWithoutMapping].join(", "));
    }
    if (unmatchedCategorySlugs.size > 0) {
      console.warn(
        `⚠️  ${unmatchedCategorySlugs.size} category_association_slug value(s) did not match any row in categories:`,
      );
      console.warn("   " + [...unmatchedCategorySlugs].join(", "));
    }
    if (unmatchedBodyPartNames.size > 0) {
      console.warn(
        `⚠️  ${unmatchedBodyPartNames.size} body part name(s) in symptomMapping did not match any row in body_parts:`,
      );
      console.warn("   " + [...unmatchedBodyPartNames].join(", "));
    }

    process.exit(failedBatches > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seedSymptoms();
