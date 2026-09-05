import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const DrugLinkQuerySchema = z.object({
  body_part_id: z.string().uuid().optional(),
  drug_id: z.string().uuid().optional(),
  search: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(300),
});

const DrugLinkPayloadSchema = z.object({
  body_part_id: z.string().uuid(),
  drug_id: z.string().uuid(),
});

type DrugBodyPartLinkRow = {
  body_part_id: string;
  drug_id: string;
  body_parts?: { id: string; name: string; body_system: string | null } | null;
  drugs?: {
    id: string;
    name: string;
    generic_name: string | null;
    category: string | null;
    availability: string | null;
    dosage_form: string | null;
    strength: string | null;
    strength_unit: string | null;
    status: string | null;
  } | null;
};

const normalizeLink = (row: DrugBodyPartLinkRow) => ({
  body_part_id: row.body_part_id,
  body_part_name: row.body_parts?.name ?? "—",
  body_system: row.body_parts?.body_system ?? null,
  drug_id: row.drug_id,
  drug_name: row.drugs?.name ?? "—",
  generic_name: row.drugs?.generic_name ?? null,
  category: row.drugs?.category ?? null,
  availability: row.drugs?.availability ?? null,
  dosage_form: row.drugs?.dosage_form ?? null,
  strength: row.drugs?.strength ?? null,
  strength_unit: row.drugs?.strength_unit ?? null,
  status: row.drugs?.status ?? null,
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = DrugLinkQuerySchema.safeParse({
    body_part_id: req.nextUrl.searchParams.get("body_part_id") || undefined,
    drug_id: req.nextUrl.searchParams.get("drug_id") || undefined,
    search: req.nextUrl.searchParams.get("search") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid drug-link query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let query = admin
    .from("drug_body_parts")
    .select(
      [
        "body_part_id",
        "drug_id",
        "body_parts(id, name, body_system)",
        "drugs(id, name, generic_name, category, availability, dosage_form, strength, strength_unit, status)",
      ].join(", "),
    )
    .limit(parsed.data.limit);

  if (parsed.data.body_part_id) {
    query = query.eq("body_part_id", parsed.data.body_part_id);
  }
  if (parsed.data.drug_id) {
    query = query.eq("drug_id", parsed.data.drug_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[anatomy/drug-links] load error:", error.message);
    return NextResponse.json(
      { error: "Failed to load drug body-part links." },
      { status: 500 },
    );
  }

  let links = ((data ?? []) as unknown as DrugBodyPartLinkRow[]).map(normalizeLink);
  if (parsed.data.search) {
    const q = parsed.data.search.toLowerCase();
    links = links.filter(
      (link) =>
        link.drug_name.toLowerCase().includes(q) ||
        (link.generic_name ?? "").toLowerCase().includes(q) ||
        link.body_part_name.toLowerCase().includes(q) ||
        (link.category ?? "").toLowerCase().includes(q),
    );
  }

  links.sort((a, b) => {
    const partCmp = a.body_part_name.localeCompare(b.body_part_name);
    return partCmp || a.drug_name.localeCompare(b.drug_name);
  });

  return NextResponse.json({ links, total: links.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = DrugLinkPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "body_part_id and drug_id are required.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("drug_body_parts")
    .upsert(parsed.data, {
      onConflict: "drug_id,body_part_id",
    })
    .select(
      [
        "body_part_id",
        "drug_id",
        "body_parts(id, name, body_system)",
        "drugs(id, name, generic_name, category, availability, dosage_form, strength, strength_unit, status)",
      ].join(", "),
    )
    .single();

  if (error) {
    console.error("[anatomy/drug-links] create error:", error.message);
    return NextResponse.json(
      { error: "Failed to link drug to body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({ link: normalizeLink(data as unknown as DrugBodyPartLinkRow) });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = DrugLinkPayloadSchema.safeParse({
    body_part_id: req.nextUrl.searchParams.get("body_part_id"),
    drug_id: req.nextUrl.searchParams.get("drug_id"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "body_part_id and drug_id query params are required." },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("drug_body_parts")
    .delete()
    .eq("body_part_id", parsed.data.body_part_id)
    .eq("drug_id", parsed.data.drug_id);

  if (error) {
    console.error("[anatomy/drug-links] delete error:", error.message);
    return NextResponse.json(
      { error: "Failed to unlink drug from body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
