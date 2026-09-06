

import * as dotenv from "dotenv";
import * as path from "path";

// `dotenv/config` only auto-loads `.env`, but this project keeps its real
// credentials in `.env.local` (the file Next.js loads automatically in dev).
// Standalone scripts run via tsx don't go through Next's loader, so we have
// to point dotenv at it explicitly or NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY
// never get set and getSupabaseAdmin() throws.
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import * as fs from "fs";
import { getSupabaseAdmin } from "../lib/supabase-admin";

// Helper function to assign an estimated MET value based on difficulty
const generateMetValue = (difficulty?: string) => {
  switch (difficulty?.toLowerCase()) {
    case "beginner":
      return "4.50"; // Light-moderate cardio
    case "intermediate":
      return "7.50"; // Vigorous cardio
    case "advanced":
      return "11.00"; // High-intensity / explosive cardio
    default:
      return "6.00"; // Moderate baseline
  }
};

// Helper function to chunk array for batch inserts
function chunkArray<T>(array: T[], size: number): T[][] {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function seed() {
  console.log("⏳ Starting fitness_exercises seed process...");

  try {
    // 1. Read and parse the JSON file
    const filePath = path.join(process.cwd(), "scripts/seed-data/liftmanual_all_workouts_transformed.json");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const exercisesData = JSON.parse(fileContent);

    console.log(`✅ Loaded ${exercisesData.length} exercises from JSON.`);

    // 2. Map JSON data to match the Drizzle Schema
    const formattedData = exercisesData.map((exercise: any) => ({
      exercise_name: exercise.exercise_name,
      category: exercise.category || "cardio",
      primary_muscle_group: exercise.primary_muscle_group,
      secondary_muscles: exercise.secondary_muscles,
      equipment_required: exercise.equipment_required,
      difficulty_level: exercise.difficulty_level,
      default_sets: exercise.default_sets,
      default_reps_duration: exercise.default_reps_duration,
      rest_time_seconds: exercise.rest_time_seconds,
      description: exercise.description,
      benefits: exercise.benefits,
      muscles_worked_raw: exercise.muscles_worked_raw,
      met_value: generateMetValue(exercise.difficulty_level),
      
      // Defaulting these values as they aren't in the JSON but required by schema
      tier: "pro",
      is_featured: false,
      is_active: true,
      status: "published",
      tags: [], 
      view_count: 0,
      completion_count: 0,
    }));

    // 3. Chunk the data into batches of 50 to prevent parameter limit errors in Postgres
    const BATCH_SIZE = 50;
    const batches = chunkArray(formattedData, BATCH_SIZE);
    const client = await getSupabaseAdmin();

    console.log(`📦 Sliced data into ${batches.length} batches of up to ${BATCH_SIZE}.`);

    // 4. Execute Batch Inserts
    for (let i = 0; i < batches.length; i++) {
      const { data: result, error } = await client.from("fitness_exercises").insert(batches[i])
      if(error){
        console.warn("Error inserting: ", error);
        
      }
      console.log(`✅ Inserted batch ${i + 1} of ${batches.length}`);
    }

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();