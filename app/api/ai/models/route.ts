import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MODEL_TYPES = [
  "classification",
  "nlp",
  "medical_nlp",
  "recommendation",
  "anomaly_detection",
  "generative_ai",
  "translation",
  "regression",
] as const;

const MODEL_STATUSES = ["active", "beta", "staging", "paused"] as const;

const DeployModelSchema = z.object({
  name: z.string().trim().min(2).max(120),
  modelKey: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase kebab-case"),
  description: z.string().trim().max(500).optional(),
  modelType: z.enum(MODEL_TYPES),
  version: z.string().trim().min(1).max(20).default("v1.0"),
  accuracyTarget: z.coerce.number().min(1).max(100).default(90),
  status: z.enum(MODEL_STATUSES).default("staging"),
});

export async function GET() {
  const auth = await requireAdminApiUser("ai.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_models")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[ai/models] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load model registry." },
      { status: 500 },
    );
  }

  return NextResponse.json({ models: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("ai.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = DeployModelSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid model payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_models")
    .insert({
      name: parsed.data.name,
      model_key: parsed.data.modelKey,
      description: parsed.data.description ?? null,
      model_type: parsed.data.modelType,
      version: parsed.data.version,
      accuracy_target: parsed.data.accuracyTarget,
      status: parsed.data.status,
      deployed_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[ai/models] insert error:", error.message);
    const isDuplicate = error.code === "23505";
    return NextResponse.json(
      {
        error: isDuplicate
          ? `A model with key "${parsed.data.modelKey}" already exists.`
          : "Failed to deploy model.",
      },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  return NextResponse.json({ model: data }, { status: 201 });
}
