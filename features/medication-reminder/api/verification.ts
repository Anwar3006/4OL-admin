import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { getObviousNonDrugReason } from "@/features/medication-reminder/data/drug-catalog-validation";

/**
 * Unknown-drug verification queue (Gap Analysis B.6 step 4). Mobile users
 * who type a drug name that doesn't match the catalog get a
 * `drug_verification_requests` row (status `pending`). Admins approve the
 * name as a new catalog entry, map it to an existing drug, or reject it.
 */

const QueueQuerySchema = z.object({
  status: z.enum(["pending", "auto_matched", "verified", "rejected"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = QueueQuerySchema.safeParse({
    status: req.nextUrl.searchParams.get("status") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
    offset: req.nextUrl.searchParams.get("offset") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let query = admin
    .from("drug_verification_requests")
    .select(
      "id, entered_name, auto_check_result, status, created_at, reviewed_at, matched_drug:drugs(id, name, generic_name)",
      { count: "exact" },
    );

  if (parsed.data.status) query = query.eq("status", parsed.data.status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(parsed.data.offset, parsed.data.offset + parsed.data.limit - 1);

  if (error) {
    console.error("[medication/verification] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load verification queue." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    requests: data ?? [],
    total: count ?? 0,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  });
}

const ActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve_new"),
    requestId: z.uuid(),
    name: z.string().trim().min(2).max(240),
    generic_name: z.string().trim().max(240).optional(),
    category: z.string().trim().max(80).nullable().optional(),
    availability: z.enum(["otc", "rx_only", "controlled", "unknown"]).default("unknown"),
    dosage_form: z.string().trim().max(80).nullable().optional(),
    strength: z.string().trim().max(60).nullable().optional(),
    strength_unit: z.string().trim().max(20).nullable().optional(),
  }),
  z.object({
    action: z.literal("map_existing"),
    requestId: z.uuid(),
    drugId: z.uuid(),
    linkReminder: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("reject"),
    requestId: z.uuid(),
    reason: z.string().trim().max(400).optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("medication.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid verification action", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const body = parsed.data;

  const { data: request, error: reqError } = await admin
    .from("drug_verification_requests")
    .select("id, status, reminder_id, entered_name")
    .eq("id", body.requestId)
    .maybeSingle();

  if (reqError || !request) {
    return NextResponse.json(
      { error: "Verification request not found." },
      { status: 404 },
    );
  }
  if (request.status === "verified" || request.status === "rejected") {
    return NextResponse.json(
      { error: `Request already ${request.status}.` },
      { status: 409 },
    );
  }

  const reviewedAt = new Date().toISOString();

  if (body.action === "approve_new") {
    const nonDrugReason = getObviousNonDrugReason({
      name: body.name,
      genericName: body.generic_name,
    });
    if (nonDrugReason) {
      return NextResponse.json(
        { error: `This entry appears not to be a medicine (${nonDrugReason}).` },
        { status: 422 },
      );
    }
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const { data: drug, error: drugError } = await admin
      .from("drugs")
      .insert({
        name: body.name,
        generic_name: body.generic_name || null,
        slug,
        category: body.category ?? null,
        availability: body.availability,
        dosage_form: body.dosage_form ?? null,
        strength: body.strength ?? null,
        strength_unit: body.strength_unit ?? null,
        // Approved drugs go live immediately (B.6 step 5).
        status: "active",
        source: "user_submission",
        metadata: { approved_from_request: body.requestId, entered_name: request.entered_name },
      })
      .select()
      .single();

    if (drugError || !drug) {
      console.error("[medication/verification] approve_new insert error:", drugError?.message);
      return NextResponse.json({ error: "Failed to create drug." }, { status: 500 });
    }

    await admin
      .from("drug_verification_requests")
      .update({
        status: "verified",
        matched_drug_id: drug.id,
        verified_by: auth.user.id,
        reviewed_at: reviewedAt,
      })
      .eq("id", body.requestId);

    if (request.reminder_id) {
      await admin
        .from("medication_reminders")
        .update({ drug_id: drug.id, drug_name: drug.name })
        .eq("id", request.reminder_id);
    }

    return NextResponse.json({ result: "approved", drug });
  }

  if (body.action === "map_existing") {
    const { data: drug } = await admin
      .from("drugs")
      .select("id, name")
      .eq("id", body.drugId)
      .maybeSingle();
    if (!drug) {
      return NextResponse.json({ error: "Target drug not found." }, { status: 404 });
    }

    await admin
      .from("drug_verification_requests")
      .update({
        status: "verified",
        matched_drug_id: drug.id,
        verified_by: auth.user.id,
        reviewed_at: reviewedAt,
      })
      .eq("id", body.requestId);

    if (body.linkReminder && request.reminder_id) {
      await admin
        .from("medication_reminders")
        .update({ drug_id: drug.id })
        .eq("id", request.reminder_id);
    }

    return NextResponse.json({ result: "mapped", drug });
  }

  // reject
  await admin
    .from("drug_verification_requests")
    .update({
      status: "rejected",
      verified_by: auth.user.id,
      reviewed_at: reviewedAt,
      auto_check_result: { admin_rejection_reason: body.reason ?? null },
    })
    .eq("id", body.requestId);

  return NextResponse.json({ result: "rejected" });
}
