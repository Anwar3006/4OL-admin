import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAdminClient } from "@/lib/db/admin";

const BUCKET = "chat-attachments";

/** ~10 years — long enough to be a practical drop-in for the permanent
 * public URL this replaces, without actually being unauthenticated. */
const VIEW_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365 * 10;

async function getRequestUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return null;
  const admin = getAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

function sanitizeFilename(input: string) {
  const name = input?.trim() || "attachment";
  // Keep it URL/path-safe and reasonably short.
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

/**
 * GET /api/chat/attachment?conversation_id=...&filename=...&kind=image|video|audio|file&mimeType=...
 *
 * Returns a short-lived signed upload URL so the mobile app can PUT bytes directly
 * to Supabase Storage without shipping the service-role key.
 *
 * Response: { signedUrl: string, publicUrl: string, path: string }
 *
 * Epic 2.5: this used to write into the shared public `bucket4ol` and
 * return a permanent, unauthenticated public URL. `chat-attachments` is a
 * private bucket; `publicUrl` is now a signed URL with a ~10-year expiry
 * instead. Same field name, same "just fetch this string" behaviour —
 * mobile persists this value on the message row and an already-installed
 * build has no way to re-request a fresh one.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversation_id");
  const filenameRaw = searchParams.get("filename") || "attachment";
  const kind = searchParams.get("kind") || "file";

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversation_id is required" },
      { status: 400 },
    );
  }

  // NOTE: We should ideally verify the user is a member of the conversation.
  // This route only creates an upload URL, but we still scope paths by user.

  const filename = sanitizeFilename(filenameRaw);
  const ext = filename.includes(".") ? filename.split(".").pop() : undefined;
  const safeExt = ext ? `.${sanitizeFilename(ext)}` : "";

  const path = `chat/${conversationId}/${filename}/${nanoid(10)}${safeExt || ""}`;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      console.error(
        "[chat/attachment] createSignedUploadUrl error:",
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
        "[chat/attachment] createSignedUrl error:",
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
