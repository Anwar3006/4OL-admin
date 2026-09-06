import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * WhatsApp group management (Gap Analysis Part T — Groups modal). Creation is
 * super_admin-scoped via whatsapp.broadcast; membership sync happens through
 * the WhatsApp Edge Function layer (T-D3), not the admin panel.
 */
const CreateGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  groupType: z.enum(["challenge", "community", "event", "gym", "wellness", "network"]).default("community"),
  linkedTo: z.enum(["admin_panel", "hcp_module", "ibp_module", "user_segments", "fitness"]).default("fitness"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("whatsapp.broadcast");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateGroupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid group", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("whatsapp_groups")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      group_type: parsed.data.groupType,
      linked_to: parsed.data.linkedTo,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[whatsapp/groups POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to create group." }, { status: 500 });
  }

  return NextResponse.json({ group: data }, { status: 201 });
}
