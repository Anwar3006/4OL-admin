import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/db/admin";
import { getRequestUser } from "@/lib/mobile-auth";
import { generateFitnessPlan } from "@/features/fitness/data/generate-plan";
import { checkRateLimit } from "@/lib/rate-limit";

// Free tier: 2 weeks on the first AI-generated plan, 1 week on the single
// allowed regeneration, then generation is locked entirely. Bump
// FREE_TIER_FIRST_GEN_MAX_WEEKS here if the cap changes later — the mobile
// UI (FitnessOnboarding.tsx, FitnessOptionsModal.tsx) mirrors these numbers
// for UX only; this route is the actual enforcement boundary.
const FREE_TIER_FIRST_GEN_MAX_WEEKS = 2;
const FREE_TIER_REGEN_MAX_WEEKS = 1;
const FREE_TIER_MAX_AI_GENERATIONS = 2; // 1 initial + 1 regen, then locked

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
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
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

  // Token-scoped client (not `admin`, which is service-role and can't
  // resolve auth.uid()) so get_my_entitlement() sees this user's identity —
  // same pattern as app/api/user/entitlement/route.ts.
  const scopedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    },
  );
  const { data: entitlementData, error: entitlementError } =
    await scopedClient.rpc("get_my_entitlement");
  if (entitlementError) {
    console.warn(
      "[fitness-generate] Entitlement lookup failed:",
      entitlementError.message,
    );
  }
  const isPremium = Boolean(entitlementData?.is_premium);

  if (!isPremium) {
    // How many AI-generated plans has this free user already been assigned
    // (active or not)? Enrolling in an admin-authored "Generated for you"
    // plan writes a fitness_user_assignments row too, so this must join to
    // fitness_plans and scope to author_type='ai' — otherwise browsing that
    // library would wrongly burn a free user's AI-generation quota.
    const { count: priorAiGenerations, error: priorAiGenerationsError } =
      await admin
        .from("fitness_user_assignments")
        .select("id, fitness_plans!inner(author_type)", {
          count: "exact",
          head: true,
        })
        .eq("user_id", userId)
        .eq("fitness_plans.author_type", "ai");

    if (priorAiGenerationsError) {
      console.warn(
        "[fitness-generate] Prior AI generation count failed:",
        priorAiGenerationsError.message,
      );
    }

    const generationsUsed = priorAiGenerations ?? 0;

    if (generationsUsed >= FREE_TIER_MAX_AI_GENERATIONS) {
      return NextResponse.json(
        {
          error:
            "You've used your free plan generations. Upgrade to Premium for unlimited AI-generated plans.",
          code: "FREE_TIER_GENERATION_LIMIT",
        },
        { status: 403 },
      );
    }

    const weeksCap =
      generationsUsed === 0
        ? FREE_TIER_FIRST_GEN_MAX_WEEKS
        : FREE_TIER_REGEN_MAX_WEEKS;
    selections.workout_weeks = Math.min(
      selections.workout_weeks || 2,
      weeksCap,
    );
  }

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

  const { data: previousAssignment, error: previousAssignmentError } =
    await admin
      .from("fitness_user_assignments")
      .select("plan_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

  if (previousAssignmentError) {
    console.warn(
      "[fitness-generate] Previous assignment lookup failed:",
      previousAssignmentError.message,
    );
  }

  const hasPreviousGeneratedPlan = Boolean(previousAssignment?.plan_id);

  // Generate the plan using shared logic
  const result = await generateFitnessPlan({
    selections,
    selection_hash,
    authorId: undefined, // Mobile onboarding - no specific author
    authorType: "ai",
    userId, // attribute the fitness_ai_calls log row to the requesting user
    allowCache: !hasPreviousGeneratedPlan,
    avoidUserPlanHistory: hasPreviousGeneratedPlan,
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
