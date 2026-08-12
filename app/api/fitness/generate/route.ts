import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { generateFitnessPlan } from "@/lib/fitness/generate-plan";
import { checkRateLimit } from "@/lib/rate-limit";

function calculateAge(birthday: string | null): number | null {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

// Ensures the user has exactly one 'active' fitness_user_assignments row,
// pointing at planId. If they already have a different active plan, marks
// it 'abandoned' first (partial unique index only allows one active row
// per user — see fitness_plan_schema_migration.sql section 4).
async function assignPlanToUser(admin: any, userId: string, planId: string) {
  const { data: existing } = await admin
    .from("fitness_user_assignments")
    .select("id, plan_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing?.plan_id === planId) return; // already on this plan, nothing to do

  if (existing?.id) {
    await admin
      .from("fitness_user_assignments")
      .update({ status: "abandoned" })
      .eq("id", existing.id);
  }

  const { error } = await admin.from("fitness_user_assignments").insert({
    user_id: userId,
    plan_id: planId,
    status: "active",
    started_at: new Date().toISOString(),
    current_week: 1,
    current_day_number: 1,
  });

  if (error) {
    console.error(
      "[fitness-generate] assignPlanToUser insert error:",
      error.message,
    );
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);
  if (authError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  const rateLimit = await checkRateLimit(admin, userId, "fitness/generate", {
    windowSeconds: 60 * 60,
    maxRequests: 5,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many plan generation requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = await req.json().catch(() => null);

  if (!body?.selections || !body?.selection_hash) {
    return NextResponse.json(
      { error: "Missing selections or hash" },
      { status: 400 },
    );
  }

  const { selections, selection_hash } = body;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("sex, dob")
    .eq("user_id", userId)
    .maybeSingle();

  const userAge = calculateAge(profile?.dob ?? null);
  const userGender = profile?.sex;

  const { gender: _g, age: _a, ...persistentSelections } = selections;
  await admin
    .from("fitness_onboarding_selections")
    .upsert(
      { user_id: userId, ...persistentSelections, selection_hash },
      { onConflict: "user_id" },
    )
    .then(({ error }: any) => {
      if (error)
        console.error("[fitness-generate] Persistence error:", error.message);
    });

  // Generate the plan using shared logic
  const result = await generateFitnessPlan({
    selections,
    selection_hash,
    authorId: undefined, // Mobile onboarding - no specific author
    authorType: "ai",
    userId, // attribute the fitness_ai_calls log row to the requesting user
  });

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.error.includes("demand") ? 503 : 500 },
    );
  }

  // Assign the plan to the requesting user (mobile-specific logic)
  if (result.planId) {
    await assignPlanToUser(admin, userId, result.planId);
  }

  return NextResponse.json({
    plan_id: result.planId,
    selection_hash: result.selection_hash,
    cached: result.cached,
  });
}
