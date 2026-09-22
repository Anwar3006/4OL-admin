/**
 * GET/POST/PATCH /api/providers/settings/capabilities — the P0-14 Settings
 * lookup editor for the capabilities table (not the RBAC catalog of the
 * same shape — this is the provider-domain lookup from P0-10).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { PROVIDER_KINDS } from "../schema/types";

export async function GET() {
  const auth = await requireAdminApiUser("provider_types.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("capabilities")
    .select("key, label, applies_to, requires_item_review, description")
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

const UPSERT_SCHEMA = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "key must be lowercase snake_case"),
  label: z.string().trim().min(1),
  applies_to: z.array(z.enum(PROVIDER_KINDS)).min(1),
  requires_item_review: z.boolean().default(true),
  description: z.string().trim().nullish(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApiUser("provider_types.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UPSERT_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from("capabilities").insert(parsed.data);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

const PATCH_SCHEMA = UPSERT_SCHEMA.omit({ key: true }).partial().extend({ key: z.string().trim().min(1) });

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApiUser("provider_types.manage");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PATCH_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const { key, ...patch } = parsed.data;
  const supabase = getAdminClient();
  const { error } = await supabase.from("capabilities").update(patch).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
