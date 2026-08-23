import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/jobs/attachment?job_id=...&kind=cv|licence|certificate|other&filename=...
 *
 * Part AM (AM-D4): short-lived signed upload URL so the mobile application
 * wizard can PUT CV / licence / certificate documents straight to Supabase
 * Storage without shipping the service-role key. Mirrors
 * /api/chat/attachment; documents land under a `jobs/` prefix in the same
 * bucket and stay referenced by job_applications.resume_url.
 */

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const KINDS = ["cv", "licence", "certificate", "other"] as const;
type Kind = (typeof KINDS)[number];

/** Mockup size caps (employment_application.html): CV 5MB, others 3–10MB.
 * Signed URLs can't enforce size, so the wizard also validates client-side. */
const MAX_SIZE_MB: Record<Kind, number> = {
  cv: 5,
  licence: 3,
  certificate: 3,
  other: 10,
};

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
  const jobId = searchParams.get("job_id");
  const filenameRaw = searchParams.get("filename") || "document";
  const kindParam = searchParams.get("kind") || "cv";
  const kind: Kind = (KINDS as readonly string[]).includes(kindParam)
    ? (kindParam as Kind)
    : "other";

  if (!jobId) {
    return NextResponse.json({ error: "job_id is required" }, { status: 400 });
  }

  const filename = sanitizeFilename(filenameRaw);
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  const safeExt = ext ? `.${sanitizeFilename(ext)}` : "";

  // Scoped per user so no applicant can overwrite another's documents.
  const path = `jobs/${user.id}/${jobId}/${kind}/${filename}/${nanoid(10)}${safeExt || ""}`;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error("[jobs/attachment] createSignedUploadUrl error:", error?.message);
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
      max_size_mb: MAX_SIZE_MB[kind],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
