import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * Anatomy ⇄ Healthy Living junction (healthy_living_body_parts).
 *
 * Mirrors /api/anatomy/drug-links and /api/anatomy/exercise-links.
 *
 * Goes through the service-role client because healthy_living_body_parts has
 * RLS enabled with NO policies — every read and write from the browser client
 * is denied, which is why the Healthy Tips tab silently showed zero links and
 * could never save one. Mobile reads it through
 * get_anatomy_body_part_bundle(), which is SECURITY DEFINER and unaffected.
 */

const TipLinkQuerySchema = z.object({
  body_part_id: z.string().uuid().optional(),
  tip_id: z.string().uuid().optional(),
  search: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(300),
});

const TipLinkPayloadSchema = z.object({
  body_part_id: z.string().uuid(),
  tip_id: z.string().uuid(),
});

type TipBodyPartLinkRow = {
  body_part_id: string;
  tip_id: string;
  source: string | null;
  body_parts?: { id: string; name: string; body_system: string | null } | null;
  healthy_living_info?: {
    id: string;
    name: string;
    slug: string | null;
    description: string | null;
    status: string | null;
  } | null;
};

const SELECT_COLUMNS = [
  "body_part_id",
  "tip_id",
  "source",
  "body_parts(id, name, body_system)",
  "healthy_living_info(id, name, slug, description, status)",
].join(", ");

const normalizeLink = (row: TipBodyPartLinkRow) => ({
  body_part_id: row.body_part_id,
  body_part_name: row.body_parts?.name ?? "—",
  body_system: row.body_parts?.body_system ?? null,
  tip_id: row.tip_id,
  tip_name: row.healthy_living_info?.name ?? "—",
  slug: row.healthy_living_info?.slug ?? null,
  description: row.healthy_living_info?.description ?? null,
  status: row.healthy_living_info?.status ?? null,
  source: row.source ?? null,
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = TipLinkQuerySchema.safeParse({
    body_part_id: req.nextUrl.searchParams.get("body_part_id") || undefined,
    tip_id: req.nextUrl.searchParams.get("tip_id") || undefined,
    search: req.nextUrl.searchParams.get("search") || undefined,
    limit: req.nextUrl.searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid tip-link query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  let query = admin
    .from("healthy_living_body_parts")
    .select(SELECT_COLUMNS)
    .limit(parsed.data.limit);

  if (parsed.data.body_part_id) {
    query = query.eq("body_part_id", parsed.data.body_part_id);
  }
  if (parsed.data.tip_id) {
    query = query.eq("tip_id", parsed.data.tip_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[anatomy/tip-links] load error:", error.message);
    return NextResponse.json(
      { error: "Failed to load healthy-living body-part links." },
      { status: 500 },
    );
  }

  let links = ((data ?? []) as unknown as TipBodyPartLinkRow[]).map(normalizeLink);
  if (parsed.data.search) {
    const q = parsed.data.search.toLowerCase();
    links = links.filter(
      (link) =>
        link.tip_name.toLowerCase().includes(q) ||
        link.body_part_name.toLowerCase().includes(q),
    );
  }

  links.sort((a, b) => {
    const partCmp = a.body_part_name.localeCompare(b.body_part_name);
    return partCmp || a.tip_name.localeCompare(b.tip_name);
  });

  return NextResponse.json({ links, total: links.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = TipLinkPayloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "body_part_id and tip_id are required.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("healthy_living_body_parts")
    .upsert({ ...parsed.data, source: "manual" }, {
      onConflict: "tip_id,body_part_id",
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error) {
    console.error("[anatomy/tip-links] create error:", error.message);
    return NextResponse.json(
      { error: "Failed to link healthy-living tip to body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    link: normalizeLink(data as unknown as TipBodyPartLinkRow),
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const parsed = TipLinkPayloadSchema.safeParse({
    body_part_id: req.nextUrl.searchParams.get("body_part_id"),
    tip_id: req.nextUrl.searchParams.get("tip_id"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "body_part_id and tip_id query params are required." },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from("healthy_living_body_parts")
    .delete()
    .eq("body_part_id", parsed.data.body_part_id)
    .eq("tip_id", parsed.data.tip_id);

  if (error) {
    console.error("[anatomy/tip-links] delete error:", error.message);
    return NextResponse.json(
      { error: "Failed to unlink healthy-living tip from body part." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
