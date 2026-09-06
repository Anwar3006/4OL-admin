import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const CreateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  templateType: z.string().trim().min(1).max(40),
  subject: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().min(1).max(2000),
  sourceModule: z.string().trim().min(1).max(60),
  variables: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("notifications.create");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = CreateTemplateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid template", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("notification_templates")
    .insert({
      name: parsed.data.name,
      template_type: parsed.data.templateType,
      subject: parsed.data.subject ?? null,
      body: parsed.data.body,
      source_module: parsed.data.sourceModule,
      variables: parsed.data.variables,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("[notifications/templates POST] Supabase error:", error.message);
    return NextResponse.json({ error: "Failed to create template." }, { status: 500 });
  }

  return NextResponse.json({ template: data }, { status: 201 });
}
