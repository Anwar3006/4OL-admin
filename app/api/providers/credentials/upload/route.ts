import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAdminClient } from "@/lib/db/admin";
import { getRequestUser } from "@/lib/mobile-auth";

const BUCKET = "provider-credentials";

function sanitizeFilename(input: string) {
  const name = input?.trim() || "document";
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get("provider_id");
  const filenameRaw = searchParams.get("filename") || "document";

  if (!providerId) {
    return NextResponse.json({ error: "provider_id is required" }, { status: 400 });
  }

  const admin = getAdminClient();
  
  // Verify ownership
  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select("owner_id")
    .eq("id", providerId)
    .single();

  if (providerError || !provider || provider.owner_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized to access this provider" }, { status: 403 });
  }

  const filename = sanitizeFilename(filenameRaw);
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  const safeExt = ext ? `.${sanitizeFilename(ext)}` : "";

  const path = `${providerId}/${nanoid(10)}${safeExt || ""}`;

  try {
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error("[providers/credentials/upload] createSignedUploadUrl error:", error?.message);
      return NextResponse.json(
        { error: error?.message ?? "Failed to create upload URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path,
      token: data.token,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
