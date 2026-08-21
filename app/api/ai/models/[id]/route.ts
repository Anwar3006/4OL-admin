import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PatchModelSchema = z
  .object({
    status: z.enum(["active", "beta", "staging", "paused"]).optional(),
    version: z.string().trim().min(1).max(20).optional(),
    accuracyLatest: z.coerce.number().min(0).max(100).nullable().optional(),
    accuracyTarget: z.coerce.number().min(1).max(100).optional(),
    latencyP50Ms: z.coerce.number().int().min(0).optional(),
    lastTrainedAt: z.iso.datetime().nullable().optional(),
    description: z.string().trim().max(500).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "No fields to update",
  });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser("ai.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid model id." }, { status: 400 });
  }

  const parsed = PatchModelSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid model patch", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.version !== undefined) updates.version = parsed.data.version;
  if (parsed.data.accuracyLatest !== undefined)
    updates.accuracy_latest = parsed.data.accuracyLatest;
  if (parsed.data.accuracyTarget !== undefined)
    updates.accuracy_target = parsed.data.accuracyTarget;
  if (parsed.data.latencyP50Ms !== undefined)
    updates.latency_p50_ms = parsed.data.latencyP50Ms;
  if (parsed.data.lastTrainedAt !== undefined)
    updates.last_trained_at = parsed.data.lastTrainedAt;
  if (parsed.data.description !== undefined)
    updates.description = parsed.data.description;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_models")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[ai/models/[id]] update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update model." },
      { status: 500 },
    );
  }

  return NextResponse.json({ model: data });
}
