import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * AF-04 — Human Atlas crosswalk + geometry-derived pins.
 *
 * Read side (anatomy.view): crosswalk coverage report, resolved Atlas pins per
 * sex, and the current body_part <-> FMA concept mappings. Write side
 * (anatomy.edit): propose/confirm/reject a mapping and recompute the derived
 * pins for a sex.
 *
 * All heavy lifting is in the migration RPCs (load_atlas_bounds,
 * resolve_body_part_atlas_pin, recompute_anatomy_atlas_pins,
 * get_anatomy_atlas_pins, get_atlas_crosswalk_coverage); this route is a thin
 * RBAC-gated pass-through so the browser never needs the service key.
 */

const SEXES = ["male", "female"] as const;
type Sex = (typeof SEXES)[number];

function isSex(v: unknown): v is Sex {
  return typeof v === "string" && (SEXES as readonly string[]).includes(v);
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const sexParam = req.nextUrl.searchParams.get("sex");
  const sex: Sex = isSex(sexParam) ? sexParam : "male";

  const [coverage, pins, mappings] = await Promise.all([
    admin.rpc("get_atlas_crosswalk_coverage"),
    admin.rpc("get_anatomy_atlas_pins", { p_sex: sex }),
    admin
      .from("body_part_atlas_map")
      .select(
        "id, body_part_id, fma_concept_id, sex, confidence, source, status, body_parts(id, name, body_system)",
      )
      .order("status")
      .limit(1000),
  ]);

  // Migration not applied yet — fail open with an empty payload rather than
  // 500, mirroring regions.ts / hotspots3d.ts.
  const applied = !coverage.error && !pins.error;
  return NextResponse.json({
    applied,
    sex,
    coverage: coverage.error ? null : coverage.data,
    pins: pins.error ? [] : ((pins.data as { pins?: unknown[] })?.pins ?? []),
    mappings: mappings.error ? [] : (mappings.data ?? []),
    errors: {
      coverage: coverage.error?.message ?? null,
      pins: pins.error?.message ?? null,
      mappings: mappings.error?.message ?? null,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const admin = getAdminClient();

  // ── Recompute derived pins for a sex ──────────────────────────────────
  if (action === "recompute") {
    if (!isSex(body?.sex)) {
      return NextResponse.json({ error: "sex (male|female) is required." }, { status: 400 });
    }
    const { data, error } = await admin.rpc("recompute_anatomy_atlas_pins", {
      p_sex: body.sex,
    });
    if (error) {
      console.error("[anatomy/atlas-crosswalk] recompute failed:", error.message);
      return NextResponse.json(
        { error: "Failed to recompute Atlas pins. Is the AF-04 migration applied and an atlas loaded?" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, result: data });
  }

  // ── Propose / confirm / reject a body_part <-> FMA mapping ────────────
  if (action === "map" || action === "set_status") {
    const bodyPartId = typeof body?.body_part_id === "string" ? body.body_part_id : null;
    const fmaConceptId = typeof body?.fma_concept_id === "string" ? body.fma_concept_id.trim() : null;
    const status = ["proposed", "confirmed", "rejected"].includes(body?.status)
      ? body.status
      : "proposed";

    if (!bodyPartId || !fmaConceptId || !isSex(body?.sex)) {
      return NextResponse.json(
        { error: "body_part_id, fma_concept_id and sex (male|female) are required." },
        { status: 400 },
      );
    }

    const confidenceRaw = body?.confidence;
    const confidence =
      confidenceRaw === null || confidenceRaw === undefined || confidenceRaw === ""
        ? null
        : Number(confidenceRaw);
    if (confidence !== null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
      return NextResponse.json({ error: "confidence must be between 0 and 1." }, { status: 400 });
    }

    const { data, error } = await admin
      .from("body_part_atlas_map")
      .upsert(
        {
          body_part_id: bodyPartId,
          fma_concept_id: fmaConceptId,
          sex: body.sex,
          confidence,
          source: action === "map" ? (body?.source ?? "manual") : "manual",
          status,
        },
        { onConflict: "body_part_id,fma_concept_id,sex" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("[anatomy/atlas-crosswalk] map upsert failed:", error.message);
      return NextResponse.json(
        { error: "Failed to save the mapping. Is the AF-04 migration applied?" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, mapping: data });
  }

  return NextResponse.json(
    { error: "Unknown action. Expected 'recompute', 'map' or 'set_status'." },
    { status: 400 },
  );
}
