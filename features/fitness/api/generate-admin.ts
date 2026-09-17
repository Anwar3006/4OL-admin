import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";
import { generateFitnessPlan, buildSelectionHash } from "@/features/fitness/data/generate-plan";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import {
  AI_MODEL_IDS,
  DEFAULT_AI_MODEL,
} from "@/features/ai/schema/models";

/**
 * Admin AI Plan Generation Endpoint
 *
 * Allows admins to generate reusable, non-personalized fitness plans.
 * Unlike the mobile onboarding endpoint, this:
 * - Does not require user_profiles (no age/gender personalization)
 * - Does not upsert fitness_onboarding_selections
 * - Does not assign the plan to any user
 * - Sets author_type to 'admin' with the admin's user_id as author_id
 * - Optionally computes a selection_hash for deduplication
 */

export async function POST(req: NextRequest) {
  try {
    // ── Admin Authentication ──
    const token = req.headers
      .get("authorization")
      ?.replace("Bearer ", "")
      .trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (optional but recommended)
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin" && profile?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    const adminUserId = user.id;

    // This endpoint had zero cost protection at all until now — unlike the
    // mobile onboarding route (5/hour), an admin could trigger unlimited
    // generations. Higher ceiling than mobile since admins are trusted,
    // but not unlimited.
    const rateLimit = await checkRateLimit(admin, adminUserId, "fitness/generate-admin", {
      windowSeconds: 60 * 60,
      maxRequests: 20,
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

    if (!body?.selections) {
      return NextResponse.json(
        { error: "Missing selections" },
        { status: 400 },
      );
    }

    const modelResult = z
      .enum(AI_MODEL_IDS)
      .safeParse(body.model ?? DEFAULT_AI_MODEL);
    if (!modelResult.success) {
      return NextResponse.json(
        { error: "Select a supported AI model." },
        { status: 400 },
      );
    }

    const { selections, title_override } = body;
    const modelName = modelResult.data;

    // Validate required fields
    if (!selections.fitness_goals || selections.fitness_goals.length === 0) {
      return NextResponse.json(
        { error: "At least one fitness goal is required" },
        { status: 400 },
      );
    }

    if (!selections.fitness_level) {
      return NextResponse.json(
        { error: "Fitness level is required" },
        { status: 400 },
      );
    }

    if (!selections.body_type) {
      return NextResponse.json(
        { error: "Body type is required for accurate plan matching" },
        { status: 400 },
      );
    }

    if (!selections.equipment_access) {
      return NextResponse.json(
        { error: "Equipment access is required for accurate plan matching" },
        { status: 400 },
      );
    }

    // Compute selection hash for deduplication (same algorithm as mobile
    // onboarding — see buildSelectionHash in features/fitness/data/generate-plan.ts).
    // NOTE: previously this did `require("@/store/use-fitness-store")`,
    // a path that only exists in the mobile app repo — it doesn't exist
    // here, so every admin generate request was throwing a
    // module-not-found error before this fix.
    const selection_hash = buildSelectionHash(selections);

    // Generate the plan using shared logic
    const result = await generateFitnessPlan({
      selections,
      selection_hash,
      authorId: adminUserId,
      authorType: "admin",
      userId: adminUserId,
      modelName,
      planStatus: "draft",
      allowCache: false,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error.includes("demand") ? 503 : 500 },
      );
    }

    if (!result.planId) {
      return NextResponse.json(
        { error: "Failed to generate plan" },
        { status: 500 },
      );
    }

    // If admin provided a title override, update the plan
    if (title_override && title_override.trim()) {
      const { error: updateError } = await admin
        .from("fitness_plans")
        .update({ title: title_override.trim() })
        .eq("id", result.planId);

      if (updateError) {
        console.error(
          "[fitness-generate-admin] Title update error:",
          updateError.message,
        );
        // Don't fail the request, just log the error
      }
    }

    // Fetch the created plan with its exercises for the response
    const { data: plan, error: fetchError } = await admin
      .from("fitness_plans")
      .select("*")
      .eq("id", result.planId)
      .single();

    if (fetchError || !plan) {
      return NextResponse.json(
        { error: "Plan created but failed to fetch details" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      plan,
      selection_hash: result.selection_hash,
      cached: result.cached,
      model: modelName,
    });
  } catch (error: any) {
    console.error("[fitness-generate-admin] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
