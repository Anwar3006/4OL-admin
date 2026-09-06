/**
 * GET /api/diseases/linkages — Page Linkages tab data source
 * (Gap Analysis Part I, I3/I-D6). Read-only junction counts plus the
 * cross-menu deep links the mockup shows; there is no linkage-edit model
 * yet (revisit with Epic 30.1).
 */

import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("diseases.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();

  async function count(table: string) {
    const { count, error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });
    return error ? null : count ?? 0;
  }

  const [
    conditionsTotal,
    bodyPartLinks,
    categoryLinks,
    causeLinks,
    typeLinks,
    symptomsTable,
  ] = await Promise.all([
    count("conditions"),
    count("condition_body_parts"),
    count("condition_categories"),
    count("condition_causes"),
    count("condition_types"),
    count("symptoms"),
  ]);

  // Conditions whose rich-text `symptoms` block is populated — the
  // condition→symptom association lives in JSONB until a junction exists.
  const { data: withSymptoms } = await admin
    .from("conditions")
    .select("id")
    .not("symptoms", "is", null);

  return NextResponse.json({
    linkages: [
      {
        key: "symptoms",
        label: "Conditions ↔ Symptoms",
        count: withSymptoms?.length ?? 0,
        note: "via conditions.symptoms rich text (no junction table yet)",
        href: "/symptoms",
        status: withSymptoms?.length ? "active" : "in-development",
      },
      {
        key: "anatomy",
        label: "Conditions ↔ Anatomy (Body Parts)",
        count: bodyPartLinks,
        note: "condition_body_parts junction",
        href: "/human-anatomy",
        status: bodyPartLinks ? "active" : "in-development",
      },
      {
        key: "categories",
        label: "Conditions ↔ Categories",
        count: categoryLinks,
        note: "condition_categories junction",
        href: "/categories",
        status: categoryLinks ? "active" : "in-development",
      },
      {
        key: "causes",
        label: "Condition Causes entries",
        count: causeLinks,
        note: "condition_causes",
        href: "/diseases",
        status: causeLinks ? "active" : "in-development",
      },
      {
        key: "types",
        label: "Condition Types entries",
        count: typeLinks,
        note: "condition_types",
        href: "/diseases",
        status: typeLinks ? "active" : "in-development",
      },
      {
        key: "medications",
        label: "Conditions ↔ Medications",
        count: null,
        note: "medications.condition_json lives in the prod-only schema — pending RPC/schema backfill (audit doc G1)",
        href: "/medication-reminder",
        status: "in-development",
      },
    ],
    registry: {
      conditions: conditionsTotal,
      symptoms: symptomsTable,
    },
  });
}
