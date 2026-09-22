/**
 * GET/POST/PATCH /api/providers/settings/provider-types — the P0-14
 * Settings lookup editor for provider_types. Adding "Nutrition shop" is a
 * data change here, not a migration.
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
    .from("provider_types")
    .select("key, kind, label, directory_category, icon, is_listed, sort_order, is_active")
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

const UPSERT_SCHEMA = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "key must be lowercase snake_case"),
  kind: z.enum(PROVIDER_KINDS),
  label: z.string().trim().min(1),
  directory_category: z.string().trim().nullish(),
  icon: z.string().trim().nullish(),
  is_listed: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
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
  const { error } = await supabase.from("provider_types").insert(parsed.data);
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
  const { error } = await supabase.from("provider_types").update(patch).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
