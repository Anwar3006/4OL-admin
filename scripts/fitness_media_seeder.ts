import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { getAdminClient } from "../lib/db/admin";

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────
const MEDIA_DIR = "constant/Fitness_IMG";
const BUCKET_NAME =
  process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "bucket4ol";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Folder name for an exercise's media. Mirrors the convention used in
 * add-exercise-dialog.tsx (fitness/media/{exercise_name}) so manually
 * uploaded and seeded media end up in the same place, keyed by exercise
 * name, which makes future migration straightforward.
 */
function sanitizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, "_");
}

function sanitizeFileName(name: string): string {
  return name.replace(/\s+/g, "_");
}

/**
 * Normalized key used to match a media file's base name against
 * exercise_name — case-insensitive, whitespace-collapsed, trimmed.
 */
function normalizeMatchKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

interface MediaPair {
  baseName: string;
  imageFile?: string;
  videoFile?: string;
}

// ─────────────────────────────────────────────────────────────
// MAIN SEEDER
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🏋️  Starting fitness media seeder...");

  const client = getAdminClient();
  const mediaDirPath = path.join(process.cwd(), MEDIA_DIR);

  if (!fs.existsSync(mediaDirPath)) {
    console.error(`❌ Media directory not found: ${mediaDirPath}`);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(mediaDirPath).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext) || VIDEO_EXTENSIONS.includes(ext);
  });

  console.log(`📂 Found ${allFiles.length} media files in ${MEDIA_DIR}`);

  // ── Group files by base name (filename without extension) ──
  const mediaByKey = new Map<string, MediaPair>();
  for (const file of allFiles) {
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file, ext);
    const key = normalizeMatchKey(baseName);

    const existing = mediaByKey.get(key) || { baseName };
    if (IMAGE_EXTENSIONS.includes(ext)) {
      existing.imageFile = file;
    } else if (VIDEO_EXTENSIONS.includes(ext)) {
      existing.videoFile = file;
    }
    mediaByKey.set(key, existing);
  }

  console.log(`🗂  Grouped into ${mediaByKey.size} exercise media set(s)`);

  // ── Fetch all exercises to match against ──
  const { data: exercises, error: fetchErr } = await client
    .from("fitness_exercises")
    .select("id, exercise_name, video_url, thumbnail_url");

  if (fetchErr || !exercises) {
    console.error("❌ Error fetching fitness_exercises:", fetchErr);
    process.exit(1);
  }

  console.log(`💪 Found ${exercises.length} exercises in database`);

  const exerciseByKey = new Map(
    exercises.map((ex) => [normalizeMatchKey(ex.exercise_name), ex]),
  );

  const unmatchedMedia = new Set<string>();
  const matchedExerciseIds = new Set<string>();
  let uploadedFiles = 0;
  let failures = 0;

  for (const [key, media] of mediaByKey.entries()) {
    const match = exerciseByKey.get(key);

    if (!match) {
      unmatchedMedia.add(media.baseName);
      continue;
    }

    matchedExerciseIds.add(match.id);
    const folder = `fitness/media/${sanitizeFolderName(match.exercise_name)}`;
    const updates: Record<string, string> = {};

    // ── Upload image → thumbnail_url ──
    if (media.imageFile) {
      const ext = path.extname(media.imageFile).toLowerCase();
      const storagePath = `${folder}/${sanitizeFileName(media.imageFile)}`;
      const fileBuffer = fs.readFileSync(
        path.join(mediaDirPath, media.imageFile),
      );

      const { error: uploadErr } = await client.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: MIME_TYPES[ext] || "application/octet-stream",
          upsert: true,
        });

      if (uploadErr) {
        console.error(
          `❌ Failed to upload image for "${match.exercise_name}":`,
          uploadErr,
        );
        failures++;
      } else {
        updates.thumbnail_url = storagePath;
        uploadedFiles++;
      }
    }

    // ── Upload video → video_url ──
    if (media.videoFile) {
      const ext = path.extname(media.videoFile).toLowerCase();
      const storagePath = `${folder}/${sanitizeFileName(media.videoFile)}`;
      const fileBuffer = fs.readFileSync(
        path.join(mediaDirPath, media.videoFile),
      );

      const { error: uploadErr } = await client.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: MIME_TYPES[ext] || "application/octet-stream",
          upsert: true,
        });

      if (uploadErr) {
        console.error(
          `❌ Failed to upload video for "${match.exercise_name}":`,
          uploadErr,
        );
        failures++;
      } else {
        updates.video_url = storagePath;
        uploadedFiles++;
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await client
        .from("fitness_exercises")
        .update(updates)
        .eq("id", match.id);

      if (updateErr) {
        console.error(
          `❌ Failed to update DB row for "${match.exercise_name}":`,
          updateErr,
        );
        failures++;
      } else {
        console.log(`✅ ${match.exercise_name} — media synced`);
      }
    }
  }

  // ── Summary ──
  console.log("\n🎉 Fitness media seeding complete.");
  console.log(`   • Files uploaded: ${uploadedFiles}`);
  console.log(`   • Exercises updated: ${matchedExerciseIds.size}`);
  console.log(`   • Failures: ${failures}`);

  if (unmatchedMedia.size > 0) {
    console.warn(
      `\n⚠️  ${unmatchedMedia.size} media file group(s) had no matching exercise_name in the database:`,
    );
    console.warn("   " + [...unmatchedMedia].join(", "));
  }

  const uncoveredExercises = exercises.filter(
    (ex) => !matchedExerciseIds.has(ex.id),
  );
  if (uncoveredExercises.length > 0) {
    console.warn(
      `\nℹ️  ${uncoveredExercises.length} exercise(s) in the database had no matching media file (left unchanged):`,
    );
    console.warn(
      "   " + uncoveredExercises.map((e) => e.exercise_name).join(", "),
    );
  }

  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("💥 Critical execution failure:", err);
  process.exit(1);
});
