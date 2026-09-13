import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAdminClient } from "@/lib/db/admin";

import { getRequestUser } from "@/lib/mobile-auth";

/**
 * GET /api/jobs/attachment?job_id=...&kind=cv|licence|certificate|other&filename=...
 *
 * Part AM (AM-D4): short-lived signed upload URL so the mobile application
 * wizard can PUT CV / licence / certificate documents straight to Supabase
 * Storage without shipping the service-role key. Mirrors
 * /api/chat/attachment; documents land in the private `job-documents`
 * bucket and stay referenced by job_applications.resume_url.
 *
 * Epic 2.5: this used to write into the shared public `bucket4ol` and
 * return a permanent, unauthenticated public URL. `job-documents` is a
 * private bucket; `publicUrl` is now a signed URL with a ~10-year expiry
 * instead. The field name and "just fetch this string" behaviour are
 * unchanged on purpose — mobile's "save my CV for reuse" flow persists
 * this value indefinitely across future, unrelated applications, and an
 * already-installed build has no way to re-request a fresh one.
 */

const BUCKET = "job-documents";

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

/** ~10 years — long enough to be a practical drop-in for the permanent
 * public URL this replaces, without actually being unauthenticated. */
const VIEW_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10;


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
    const admin = getAdminClient();
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

    const { data: viewData, error: viewError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, VIEW_URL_EXPIRY_SECONDS);

    if (viewError || !viewData) {
      console.error("[jobs/attachment] createSignedUrl error:", viewError?.message);
      return NextResponse.json(
        { error: viewError?.message ?? "Failed to create view URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      publicUrl: viewData.signedUrl,
      path,
      max_size_mb: MAX_SIZE_MB[kind],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
