import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { getSupabaseAdmin } from "../lib/supabase-admin";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────
const BATCH_SIZE = 50;
const SEED_FILE = "constant/nhs_healthy_living_seed.json";

// healthy_living_info has NO separate categories table or junction table —
// hierarchy is expressed purely through the self-referencing `parent_id`
// column. So each entry in `categories_seed` becomes a top-level "hub" row
// (content_type: "category"), and each article in `symptoms_seed` becomes a
// child row pointing at its hub via parent_id (resolved from
// `category_association_slug`).

// Lexical-content fields to fold into the `content_sections` jsonb array.
// NOTE: "attribution" is intentionally excluded here — it's provenance
// metadata, not a body section, and healthy_living_info has its own
// dedicated `attribution` jsonb column for it.
const CONTENT_SECTION_FIELDS: { key: string; label: string }[] = [
  { key: "about", label: "About" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "treatment", label: "Treatment" },
  { key: "complications", label: "Complications" },
  { key: "prevention", label: "Prevention" },
  { key: "contact_your_doctor", label: "When to Contact Your Doctor" },
  { key: "more_information", label: "More Information" },
];

const AVERAGE_WORDS_PER_MINUTE = 200;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Check if a Lexical content field has actual content (non-empty children).
 */
function hasContent(fieldValue: any): boolean {
  if (!fieldValue || typeof fieldValue !== "object") return false;
  const root = fieldValue.root;
  if (!root || !Array.isArray(root.children)) return false;
  return root.children.length > 0;
}

/**
 * Recursively collect all "text" node contents from a Lexical JSON tree.
 */
function collectText(lexicalJson: any): string[] {
  if (!hasContent(lexicalJson)) return [];
  const texts: string[] = [];
  function walk(nodes: any[]) {
    for (const node of nodes || []) {
      if (node.type === "text" && node.text) texts.push(node.text);
      if (Array.isArray(node.children)) walk(node.children);
    }
  }
  walk(lexicalJson.root.children);
  return texts;
}

/**
 * Short plain-text preview (~200 chars) used for the `description` column.
 */
function extractTextPreview(lexicalJson: any): string | null {
  const fullText = collectText(lexicalJson).join(" ").trim();
  if (!fullText) return null;
  return fullText.length > 200 ? fullText.slice(0, 200) + "…" : fullText;
}

/**
 * Build the `content_sections` jsonb ARRAY (column default is '[]'::jsonb,
 * i.e. an array, not a keyed object) from all populated Lexical fields,
 * preserving full Lexical structure for frontend rendering.
 */
function buildContentSections(item: any): Array<{
  key: string;
  label: string;
  content: any;
}> {
  const sections: Array<{ key: string; label: string; content: any }> = [];
  for (const { key, label } of CONTENT_SECTION_FIELDS) {
    const value = item[key];
    if (hasContent(value)) {
      sections.push({ key, label, content: value });
    }
  }
  return sections;
}

/**
 * Build a plain-text `description` summary — prefers the "about" section,
 * falling back to the first populated section.
 */
function buildDescription(item: any): string | null {
  if (hasContent(item.about)) {
    const preview = extractTextPreview(item.about);
    if (preview) return preview;
  }
  for (const { key } of CONTENT_SECTION_FIELDS) {
    if (hasContent(item[key])) {
      const preview = extractTextPreview(item[key]);
      if (preview) return preview;
    }
  }
  return null;
}

/**
 * Estimate reading time across all populated sections combined.
 */
function estimateReadingTimeMinutes(item: any): number | null {
  let wordCount = 0;
  for (const { key } of CONTENT_SECTION_FIELDS) {
    const text = collectText(item[key]).join(" ");
    if (text) wordCount += text.split(/\s+/).filter(Boolean).length;
  }
  if (wordCount === 0) return null;
  return Math.max(1, Math.round(wordCount / AVERAGE_WORDS_PER_MINUTE));
}

// ─────────────────────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────────────────────

async function seedHealthyLiving() {
  console.log("🚀 Starting Healthy Living database seeding process...");

  const client = getSupabaseAdmin();

  const filePath = path.join(process.cwd(), SEED_FILE);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: Seed file not found at ${filePath}`);
    process.exit(1);
  }

  const seedData = JSON.parse(fs.readFileSync(filePath, "utf8"));

  const categoriesSeed = seedData.categories_seed || [];
  // Historical key name in this seed file is "symptoms_seed" even though
  // it holds healthy-living articles, not symptoms.
  const articlesSeed: any[] = seedData.healthy_living_seed || seedData.symptoms_seed || [];

  if (articlesSeed.length === 0) {
    console.error(
      "❌ No healthy living articles found in seed file (checked 'healthy_living_seed' and 'symptoms_seed')",
    );
    process.exit(1);
  }

  console.log(
    `📋 Found ${categoriesSeed.length} categories and ${articlesSeed.length} healthy living articles`,
  );

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Upsert category "hub" rows (top-level, parent_id null)
  // ═══════════════════════════════════════════════════════════
  if (categoriesSeed.length > 0) {
    console.log(`📦 Upserting ${categoriesSeed.length} category hub rows...`);

    const hubPayload = categoriesSeed.map((cat: any, index: number) => ({
      name: cat.name,
      slug: cat.slug,
      description: null,
      content_sections: [],
      display_order: index,
      parent_id: null,
      image_url: null,
      attribution: {},
      status: "published",
      is_featured: false,
      content_type: "category",
      tags: [],
    }));

    const { error: hubUpsertErr } = await client
      .from("healthy_living_info")
      .upsert(hubPayload, { onConflict: "slug" });

    if (hubUpsertErr) {
      console.error("❌ Error upserting category hub rows:", hubUpsertErr);
      process.exit(1);
    }
    console.log("✅ Category hub rows synchronized.");
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Fetch hub IDs to resolve parent_id for articles
  // ═══════════════════════════════════════════════════════════
  const { data: hubRows, error: fetchHubErr } = await client
    .from("healthy_living_info")
    .select("id, slug")
    .eq("content_type", "category");

  if (fetchHubErr || !hubRows) {
    console.error("❌ Error fetching category hub rows from DB:", fetchHubErr);
    process.exit(1);
  }

  const hubMap = new Map<string, string>(hubRows.map((h) => [h.slug, h.id]));
  console.log(`🔗 Mapped ${hubMap.size} category hub rows from database`);

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Process articles in batches
  // ═══════════════════════════════════════════════════════════
  const unmatchedCategorySlugs = new Set<string>();
  const articlesWithoutSections = new Set<string>();
  const batches = chunkArray(articlesSeed, BATCH_SIZE);

  console.log(
    `🔄 Processing ${articlesSeed.length} articles in ${batches.length} batches...`,
  );

  // Track per-category ordering so children display in their original
  // (NHS source page) order under each hub.
  const displayOrderByCategory = new Map<string, number>();

  let totalUpserted = 0;
  let failedBatches = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const payload = batch.map((item: any) => {
      const name = item.name || item.title;
      const slug = item.slug || slugify(name);
      const catSlug = item.category_association_slug || item.category_slug;
      const parentId = catSlug ? hubMap.get(catSlug) ?? null : null;

      if (catSlug && !parentId) {
        unmatchedCategorySlugs.add(catSlug);
      }

      const contentSections = buildContentSections(item);
      if (contentSections.length === 0) {
        articlesWithoutSections.add(name);
      }

      const orderKey = catSlug || "__uncategorized__";
      const displayOrder = displayOrderByCategory.get(orderKey) ?? 0;
      displayOrderByCategory.set(orderKey, displayOrder + 1);

      return {
        name,
        slug,
        description: buildDescription(item),
        content_sections: contentSections,
        display_order: displayOrder,
        parent_id: parentId,
        image_url: item.image_url || null,
        attribution: item.attribution || {},
        status: item.status || "published",
        is_featured: item.is_featured ?? false,
        content_type: "article",
        tags: [],
        reading_time_minutes: estimateReadingTimeMinutes(item),
      };
    });

    const { data: inserted, error: upsertErr } = await client
      .from("healthy_living_info")
      .upsert(payload, { onConflict: "slug" })
      .select("id, slug");

    if (upsertErr || !inserted) {
      console.error(`❌ Error inserting batch ${i + 1}:`, upsertErr);
      failedBatches++;
      continue;
    }

    totalUpserted += inserted.length;
    console.log(
      `✅ Batch ${i + 1}/${batches.length} — upserted ${inserted.length} articles`,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Final Summary
  // ═══════════════════════════════════════════════════════════
  if (failedBatches > 0) {
    console.error(
      `❌ Seeding finished with ${failedBatches} failed batch(es) out of ${batches.length}. See errors above.`,
    );
  } else {
    console.log("🎉 Seeding completed successfully!");
  }
  console.log(`   • Total category hub rows: ${categoriesSeed.length}`);
  console.log(`   • Total articles upserted: ${totalUpserted}`);

  if (unmatchedCategorySlugs.size > 0) {
    console.warn(
      `\n⚠️  ${unmatchedCategorySlugs.size} category_association_slug value(s) did not match any hub row:`,
    );
    console.warn("   " + [...unmatchedCategorySlugs].join(", "));
  }
  if (articlesWithoutSections.size > 0) {
    console.warn(
      `\n⚠️  ${articlesWithoutSections.size} article(s) had no populated content sections:`,
    );
    console.warn("   " + [...articlesWithoutSections].join(", "));
  }

  process.exit(failedBatches > 0 ? 1 : 0);
}

seedHealthyLiving().catch((err) => {
  console.error("💥 Critical execution failure:", err);
  process.exit(1);
});
