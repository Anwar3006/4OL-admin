import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { FitnessWorkoutPlan } from "@/types/fitness";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const workoutSchema = {
  description: "Personalized fitness workout plan",
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    summary: { type: SchemaType.STRING },
    duration_weeks: { type: SchemaType.NUMBER },
    days_per_week: { type: SchemaType.NUMBER },
    weekly_schedule: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          week: { type: SchemaType.NUMBER },
          days: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                day: { type: SchemaType.STRING },
                session_type: { type: SchemaType.STRING },
                duration_minutes: { type: SchemaType.NUMBER },
                exercises: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      id: { type: SchemaType.STRING },
                      name: { type: SchemaType.STRING },
                      sets: { type: SchemaType.NUMBER },
                      reps: { type: SchemaType.STRING },
                      rest_seconds: { type: SchemaType.NUMBER },
                      description: { type: SchemaType.STRING },
                      muscles_targeted: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                      video_url: { type: SchemaType.STRING },
                      thumbnail_urls: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                    },
                    required: ["id", "name", "description", "muscles_targeted"],
                  },
                },
              },
              required: ["day", "session_type", "exercises"],
            },
          },
        },
        required: ["week", "days"],
      },
    },
  },
  required: ["title", "summary", "weekly_schedule"],
};

const bodyPartMap: Record<string, string[]> = {
  fullBody: ["Arm","Back","Biceps","Chest","Chest and Triceps","Glutes","Hamstring","Legs","Quadriceps","Rectus Abdominus Muscle","Shoulder","Triceps"],
  upperBody: ["Arm","Back","Biceps","Chest","Chest and Triceps","Shoulder","Triceps"],
  lowerBody: ["Glutes","Hamstring","Legs","Quadriceps"],
  core: ["Rectus Abdominus Muscle"],
  cardio: [],
};

const equipmentMap: Record<string, string[]> = {
  bodyweight_only: ["No Equipment","Yoga/ Exercise Mat"],
  dumbbells: ["Dumbbell","No Equipment","Yoga/ Exercise Mat"],
  resistance_bands: ["Resistance Band","No Equipment","Yoga/ Exercise Mat"],
  full_gym: ["No Equipment","Barbell","Dumbbell","Kettlebell","Gym Machine Workout","Resistance Band","Treadmill","Exercise Bike","Yoga/ Exercise Mat","Skipping Ropes","Exercise Balls","Weight Bench","Pull up bar"],
};

function calculateAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

export async function POST(req: NextRequest) {
  // Auth: validate Bearer token from the mobile app's Supabase session
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const body = await req.json().catch(() => null);

  if (!body?.selections || !body?.selection_hash) {
    return NextResponse.json({ error: "Missing selections or hash" }, { status: 400 });
  }

  const { selections, selection_hash } = body;

  // Fetch user profile for age/gender enrichment
  const { data: profile } = await admin
    .from("user_profiles")
    .select("sex, dob")
    .eq("user_id", userId)
    .maybeSingle();

  const userAge = calculateAge(profile?.dob ?? null);
  const userGender = profile?.sex;

  // Persist onboarding selections (strip non-DB fields)
  const { gender: _g, age: _a, ...persistentSelections } = selections;
  await admin
    .from("fitness_onboarding_selections")
    .upsert({ user_id: userId, ...persistentSelections, selection_hash }, { onConflict: "user_id" })
    .then(({ error }) => {
      if (error) console.error("[fitness-generate] Persistence error:", error.message);
    });

  // Cache check
  const { data: cachedWorkout } = await admin
    .from("fitness_generated_workouts")
    .select("workout_plan")
    .eq("selection_hash", selection_hash)
    .maybeSingle();

  if (cachedWorkout?.workout_plan) {
    return NextResponse.json({ workout_plan: cachedWorkout.workout_plan, selection_hash, cached: true });
  }

  // Gemini generation
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-1.5-flash";

  if (!geminiApiKey) {
    return NextResponse.json({ error: "Gemini API key missing" }, { status: 500 });
  }

  const allowedBodyParts = selections.focus_areas?.flatMap((area: string) => bodyPartMap[area] || []) || [];
  const allowedEquipment = selections.equipment?.flatMap((eq: string) => equipmentMap[eq] || []) || equipmentMap.bodyweight_only;
  const uniqueBodyParts = [...new Set(allowedBodyParts)];
  const uniqueEquipment = [...new Set(allowedEquipment)];

  let workoutQuery = admin
    .from("workouts")
    .select("id, exercise_name, primary_body_part, secondary_body_part, equipment_type, video_url, thumbnail_urls, how_to")
    .eq("is_active", true);

  if (uniqueEquipment.length > 0) workoutQuery = workoutQuery.in("equipment_type", uniqueEquipment as string[]);
  if (uniqueBodyParts.length > 0 && !selections.focus_areas?.includes("fullBody")) {
    workoutQuery = workoutQuery.or(`primary_body_part.in.(${uniqueBodyParts.join(",")}),secondary_body_part.in.(${uniqueBodyParts.join(",")})`);
  }

  const { data: dbWorkouts, error: dbError } = await workoutQuery;
  if (dbError) console.error("[fitness-generate] DB fetch error:", dbError.message);

  if (!dbWorkouts || dbWorkouts.length === 0) {
    return NextResponse.json({ workout_plan: null, message: "No workouts match your preferences. Try adjusting your focus areas or equipment." });
  }

  const availableWorkoutsContext = dbWorkouts.map(w => ({
    id: w.id,
    name: w.exercise_name,
    muscles_targeted: [w.primary_body_part, w.secondary_body_part].filter(Boolean),
    equipment: w.equipment_type,
    video_url: w.video_url,
    thumbnail_urls: w.thumbnail_urls,
    how_to: w.how_to,
  }));

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json", responseSchema: workoutSchema as any },
  });

  const fullProfile = { ...selections, gender: userGender || selections.gender, age: userAge || selections.age };
  const sessionMinutes = selections.workout_duration ?? 45;
  const daysPerWeek = selections.workout_frequency ?? 3;

  const userPrompt = `
Generate a 2-week personalized fitness workout plan using ONLY the provided exercises from our library.

LIBRARY OF AVAILABLE EXERCISES:
${JSON.stringify(availableWorkoutsContext)}

USER PROFILE & CONSTRAINTS:
- Primary Goal: ${selections.fitness_goal?.replace(/_/g, " ")}
- Fitness Level: ${selections.fitness_level}
- Training Frequency: ${daysPerWeek} days per week
- Session Duration: ${sessionMinutes} minutes per session
- Equipment Available: ${selections.equipment?.join(", ") || "bodyweight only"}
- Focus Areas: ${selections.focus_areas?.join(", ") || "full body"}
${fullProfile.gender ? `- Gender: ${fullProfile.gender}` : ""}
${fullProfile.age ? `- Age: ${fullProfile.age} years` : ""}
${selections.weight_kg ? `- Weight: ${selections.weight_kg} kg` : ""}
${selections.height_cm ? `- Height: ${selections.height_cm} cm` : ""}

IMPORTANT RULES:
1. MANDATORY: Select exercises EXCLUSIVELY from the LIBRARY above. Use their exact "id", "name", "video_url", and "thumbnail_urls".
2. Return exactly 2 weeks. Week 2 shows slight progression over Week 1.
3. Each week must contain ALL 7 days. Rest days: session_type "Rest", duration_minutes 0, exercises [].
4. Active days must have approximately ${Math.round(sessionMinutes / 8)} exercises.
5. Match difficulty to the user's ${selections.fitness_level} level and ${selections.fitness_goal} goal.
6. For each exercise provide: sets (number), reps (string e.g. "10-12"), rest_seconds (integer), description (1-2 sentences).
7. Repeat exercises across days for variety if library is small, but ensure variety within a single session.
  `.trim();

  try {
    const result = await model.generateContent(userPrompt);
    const workoutPlan = JSON.parse(result.response.text()) as FitnessWorkoutPlan;

    // Hydrate with full DB data
    const workoutMap = new Map(dbWorkouts.map(w => [w.id, w]));
    workoutPlan.weekly_schedule.forEach(week => {
      week.days.forEach(day => {
        day.exercises = day.exercises.map(ex => {
          const dbEx = workoutMap.get(ex.id || "");
          if (dbEx) {
            return {
              ...ex,
              name: dbEx.exercise_name,
              video_url: dbEx.video_url,
              thumbnail_urls: dbEx.thumbnail_urls,
              how_to: dbEx.how_to,
              muscles_targeted: [dbEx.primary_body_part, dbEx.secondary_body_part].filter(Boolean),
            };
          }
          return ex;
        });
      });
    });

    await admin.from("fitness_generated_workouts").insert({ selection_hash, workout_plan: workoutPlan, generated_by: "gemini-1.5-flash-sdk" });

    return NextResponse.json({ workout_plan: workoutPlan, selection_hash, cached: false });
  } catch (error: any) {
    console.error("[fitness-generate] Gemini error:", error);
    return NextResponse.json({ error: "AI Generation failed" }, { status: 500 });
  }
}
