import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const BUCKET = "provider-credentials";
const VIEW_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider_id: string; file_name: string }> }
) {
  const auth = await requireAdminApiUser("facilities.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const { provider_id, file_name } = await params;

  if (!provider_id || !file_name) {
    return NextResponse.json({ error: "provider_id and file_name are required" }, { status: 400 });
  }

  const path = `${provider_id}/${file_name}`;
  const admin = getAdminClient();

  try {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, VIEW_URL_EXPIRY_SECONDS);

    if (error || !data) {
      console.error("[providers/credentials/read] createSignedUrl error:", error?.message);
      return NextResponse.json(
        { error: error?.message ?? "Failed to create signed read URL" },
        { status: 500 },
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
