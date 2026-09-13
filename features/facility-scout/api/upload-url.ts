import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAdminClient } from "@/lib/db/admin";

import { getRequestUser } from "@/lib/mobile-auth";
const BUCKET = "facility-scout-photos";

/** ~10 years — same practical-permanent-URL tradeoff as chat attachments. */
const VIEW_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10;


function sanitizeFilename(input: string) {
  const name = input?.trim() || "photo";
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

/**
 * GET /api/facilityscout/submissions/upload-url?filename=...
 *
 * Returns a short-lived signed upload URL so the mobile app can PUT a scout
 * photo directly to Supabase Storage without shipping the service-role key.
 * No parent-resource id: the submission row doesn't exist yet at upload
 * time — the mobile flow uploads the photo(s) first, then inserts the
 * facility_scout_submissions row with the resulting URLs. Path is scoped by
 * the caller's own user id instead.
 *
 * Response: { signedUrl: string, publicUrl: string, path: string }
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filenameRaw = searchParams.get("filename") || "photo";
  const filename = sanitizeFilename(filenameRaw);
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  const safeExt = ext ? `.${sanitizeFilename(ext)}` : "";

  const path = `facility-scout/${user.id}/${nanoid(10)}${safeExt || ""}`;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error(
        "[facilityscout/upload-url] createSignedUploadUrl error:",
        error?.message,
      );
      return NextResponse.json(
        { error: error?.message ?? "Failed to create upload URL" },
        { status: 500 },
      );
    }

    const { data: viewData, error: viewError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, VIEW_URL_EXPIRY_SECONDS);

    if (viewError || !viewData) {
      console.error(
        "[facilityscout/upload-url] createSignedUrl error:",
        viewError?.message,
      );
      return NextResponse.json(
        { error: viewError?.message ?? "Failed to create view URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      publicUrl: viewData.signedUrl,
      path,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
