import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/medenquiry/attachment?filename=...
 *
 * Part AN (AN-D4): short-lived signed upload URL so the mobile Find
 * Medication form can PUT a prescription photo straight to Supabase
 * Storage without shipping the service-role key. Mirrors
 * /api/jobs/attachment; photos land under a `prescriptions/` prefix in
 * the same bucket and stay referenced by
 * medication_enquiries.prescription_url. Prescription upload is free for
 * all users — it is a safety/compliance feature, not a premium gate.
 */

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Prescription photos are images only; capped at 5MB (client also validates). */
const MAX_SIZE_MB = 5;

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

function sanitizeFilename(input: string) {
  const name = input?.trim() || "prescription";
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
  const filenameRaw = searchParams.get("filename") || "prescription";

  const filename = sanitizeFilename(filenameRaw);
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  const safeExt = ext ? `.${sanitizeFilename(ext)}` : "";

  // Scoped per user so no requester can overwrite another's photos.
  const path = `prescriptions/${user.id}/${filename}/${nanoid(10)}${safeExt || ""}`;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error("[medenquiry/attachment] createSignedUploadUrl error:", error?.message);
      return NextResponse.json(
        { error: error?.message ?? "Failed to create upload URL" },
        { status: 500 },
      );
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    return NextResponse.json({
      signedUrl: data.signedUrl,
      publicUrl,
      path,
      max_size_mb: MAX_SIZE_MB,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
