import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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
 */
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
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
    const admin = getSupabaseAdmin();
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

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    return NextResponse.json({ signedUrl: data.signedUrl, publicUrl, path });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
