import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAdminClient } from "@/lib/db/admin";

import { getRequestUser } from "@/lib/mobile-auth";

/**
 * GET /api/medenquiry/attachment?filename=...
 *
 * Part AN (AN-D4): short-lived signed upload URL so the mobile Find
 * Medication form can PUT a prescription photo straight to Supabase
 * Storage without shipping the service-role key. Mirrors
 * /api/jobs/attachment; photos land in the private `prescriptions` bucket
 * and stay referenced by medication_enquiries.prescription_url.
 * Prescription upload is free for all users — it is a safety/compliance
 * feature, not a premium gate.
 *
 * Epic 2.5: this used to write into the shared public `bucket4ol` and
 * return a permanent, unauthenticated public URL — a prescription photo
 * (health data) was readable forever by anyone who ever obtained that one
 * URL. `prescriptions` is a private bucket; `publicUrl` is now a signed URL
 * with a ~10-year expiry instead. The field name and "just fetch this
 * string" behaviour are unchanged on purpose — mobile persists this value
 * (medication_enquiries.prescription_url) and an already-installed build
 * has no way to re-request a fresh one, so this had to stay a drop-in
 * value, not a contract change.
 */

const BUCKET = "prescriptions";

/** Prescription photos are images only; capped at 5MB (client also validates). */
const MAX_SIZE_MB = 5;

/** ~10 years — long enough to be a practical drop-in for the permanent
 * public URL this replaces, without actually being unauthenticated. */
const VIEW_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10;


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
    const admin = getAdminClient();
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

    const { data: viewData, error: viewError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, VIEW_URL_EXPIRY_SECONDS);

    if (viewError || !viewData) {
      console.error("[medenquiry/attachment] createSignedUrl error:", viewError?.message);
      return NextResponse.json(
        { error: viewError?.message ?? "Failed to create view URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      publicUrl: viewData.signedUrl,
      path,
      max_size_mb: MAX_SIZE_MB,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
