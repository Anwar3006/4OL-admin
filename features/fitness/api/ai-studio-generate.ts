import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  adminAuthErrorResponse,
  requireAdminApiUser,
} from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  AI_STUDIO_MODULE_MAP,
  AI_STUDIO_OUTPUT_JSON_SCHEMA,
  AiStudioGenerateRequestSchema,
  AiStudioOutputSchema,
} from "@/features/fitness/schema/ai-studio";

async function logCall({
  userId,
  model,
  prompt,
  startedAt,
  status,
  usage,
  errorMessage,
}: {
  userId: string;
  model: string;
  prompt: string;
  startedAt: number;
  status: "success" | "error" | "timeout";
  usage?: { total_tokens?: number | null };
  errorMessage?: string;
}) {
  const admin = getAdminClient();
  const { error } = await admin.from("fitness_ai_calls").insert({
    user_id: userId,
    model_name: model,
    prompt_snippet: prompt.slice(0, 500),
    response_time_ms: Date.now() - startedAt,
    token_usage: usage?.total_tokens ?? null,
    // Pricing is deliberately not guessed for newly selectable models. The
    // usage log remains accurate; cost stays null until billing rates are
    // maintained in a single provider-pricing source.
    estimated_cost: null,
    status,
    error_message: errorMessage ?? null,
  });
  if (error) {
    console.error("[fitness-ai-studio] Unable to write AI call log:", error.message);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("fitness.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = AiStudioGenerateRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Check the generation form and try again.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const moduleConfig = AI_STUDIO_MODULE_MAP[input.module];
  const admin = getAdminClient();
  const rateLimit = await checkRateLimit(
    admin,
    auth.user.id,
    "fitness/ai-studio/generate",
    { windowSeconds: 60 * 60, maxRequests: 20 },
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "AI Studio has reached its hourly generation limit. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI generation is not configured. Add OPENAI_API_KEY first." },
      { status: 503 },
    );
  }

  const context = {
    topic: input.topic,
    goal: input.goal || "Not specified",
    audience: input.audience,
    difficulty: input.difficulty,
    duration: input.duration || "Not specified",
    location: input.location,
    equipment: input.equipment || "Not specified",
    tone: input.tone,
    additionalInstructions: input.instructions || "None",
  };
  const prompt = `You are the governed Fitness AI Studio copilot for the 4 Our Life admin team.

Create exactly ${input.quantity} distinct, review-ready ${moduleConfig.label} draft${input.quantity === 1 ? "" : "s"}.

MODULE PURPOSE
${moduleConfig.description}

REQUIRED CONTENT
${moduleConfig.outputGuide}

ADMIN CONTEXT
${JSON.stringify(context)}

RULES
- Return practical admin drafts, not vague suggestions.
- Keep every field concise enough to review in an admin dashboard.
- Never claim that content is medically approved, clinically verified or guaranteed safe.
- Do not diagnose, prescribe treatment or infer sensitive health information.
- For exercise or plan content, use conservative progressions and state what a qualified human must verify.
- For analytics, use only figures supplied in ADMIN CONTEXT and clearly separate facts from hypotheses.
- For outdoor content, never invent GPS coordinates or route verification.
- All output is a draft. Add meaningful safety_notes and implementation_notes, using empty arrays only when genuinely unnecessary.`;

  const startedAt = Date.now();
  try {
    const completion = await new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }).chat.completions.create({
      // This must remain the validated admin choice. Do not replace it with
      // an environment default: the response and audit log both report the
      // exact value sent to the provider.
      model: input.model,
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fitness_ai_studio_drafts",
          strict: true,
          schema: AI_STUDIO_OUTPUT_JSON_SCHEMA as Record<string, unknown>,
        },
      },
    });

    const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const output = AiStudioOutputSchema.safeParse(raw);
    if (!output.success) throw new Error("AI_OUTPUT_FAILED_VALIDATION");

    const items = output.data.items.slice(0, input.quantity);
    await logCall({
      userId: auth.user.id,
      model: input.model,
      prompt: `AI Studio · ${moduleConfig.label} · ${input.topic}`,
      startedAt,
      status: "success",
      usage: completion.usage,
    });

    return NextResponse.json({
      module: input.module,
      model: input.model,
      providerModel: completion.model,
      generatedAt: new Date().toISOString(),
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI_GENERATION_FAILED";
    await logCall({
      userId: auth.user.id,
      model: input.model,
      prompt: `AI Studio · ${moduleConfig.label} · ${input.topic}`,
      startedAt,
      status: "error",
      errorMessage: message.slice(0, 500),
    });
    console.error("[fitness-ai-studio] Generation failed:", message);
    return NextResponse.json(
      {
        error:
          message === "AI_OUTPUT_FAILED_VALIDATION"
            ? "The AI response could not be validated. No draft was saved."
            : `The selected model (${input.model}) could not complete this generation.`,
      },
      { status: 422 },
    );
  }
}
