import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BodyMapQuerySchema = z.object({
  bodySystem: z
    .enum(["all", "cardiovascular", "nervous", "skeletal", "respiratory"])
    .default("all"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

type BodyPartRow = {
  id: string;
  name: string;
  parent_id: string | null;
  mesh_id: string | null;
  path: string;
  level: number | null;
};

const systemKeywords: Record<string, string[]> = {
  cardiovascular: ["heart", "artery", "vein", "blood", "cardiac", "vascular"],
  nervous: ["brain", "nerve", "spinal", "neural", "head"],
  skeletal: ["bone", "skull", "spine", "rib", "joint", "knee", "arm", "leg"],
  respiratory: ["lung", "throat", "nose", "airway", "bronch", "chest"],
};

function inferSystem(part: BodyPartRow) {
  const haystack = `${part.name} ${part.path ?? ""} ${part.mesh_id ?? ""}`
    .toLowerCase()
    .replace(/[_-]/g, " ");

  for (const [system, keywords] of Object.entries(systemKeywords)) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return system;
    }
  }

  return "general";
}

export async function GET(req: NextRequest) {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodyMapQuerySchema.safeParse({
    bodySystem: req.nextUrl.searchParams.get("bodySystem") || "all",
    limit: req.nextUrl.searchParams.get("limit") || "100",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const [partsResult, symptomLinksResult, conditionLinksResult] =
    await Promise.all([
      admin
        .from("body_parts")
        .select("id, name, parent_id, mesh_id, path, level")
        .order("level", { ascending: true })
        .order("name", { ascending: true })
        .limit(parsed.data.limit),
      admin.from("symptom_body_parts").select("body_part_id"),
      admin.from("condition_body_parts").select("body_part_id"),
    ]);

  if (partsResult.error) {
    console.error("[anatomy/body-map] body parts error:", partsResult.error.message);
    return NextResponse.json(
      { error: "Failed to load body parts." },
      { status: 500 },
    );
  }

  if (symptomLinksResult.error || conditionLinksResult.error) {
    console.error(
      "[anatomy/body-map] link count error:",
      symptomLinksResult.error?.message || conditionLinksResult.error?.message,
    );
    return NextResponse.json(
      { error: "Failed to load anatomy link counts." },
      { status: 500 },
    );
  }

  const symptomCounts = new Map<string, number>();
  const conditionCounts = new Map<string, number>();

  for (const link of symptomLinksResult.data ?? []) {
    symptomCounts.set(
      link.body_part_id,
      (symptomCounts.get(link.body_part_id) ?? 0) + 1,
    );
  }

  for (const link of conditionLinksResult.data ?? []) {
    conditionCounts.set(
      link.body_part_id,
      (conditionCounts.get(link.body_part_id) ?? 0) + 1,
    );
  }

  const parts = ((partsResult.data ?? []) as BodyPartRow[])
    .map((part) => ({
      ...part,
      body_system: inferSystem(part),
      symptom_count: symptomCounts.get(part.id) ?? 0,
      condition_count: conditionCounts.get(part.id) ?? 0,
    }))
    .filter(
      (part) =>
        parsed.data.bodySystem === "all" ||
        part.body_system === parsed.data.bodySystem,
    );

  return NextResponse.json({
    parts,
    total: parts.length,
    system: parsed.data.bodySystem,
  });
}
