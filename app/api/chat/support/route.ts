import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function getRequestUser(req: NextRequest) {
  const token = req.headers
    .get("authorization")
    ?.replace("Bearer ", "")
    .trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);
  if (error || !user?.id) return null;
  return user;
}

const VALID_PRIORITIES = ["Low", "Medium", "High"];

/**
 * GET /api/chat/support
 *
 * Returns the authenticated user's own support tickets (mobile "My
 * Tickets" view). Admin listing/management of ALL tickets goes through
 * the admin dashboard's direct Supabase hook (hooks/supabase-calls/useChat.ts),
 * not this route — this is scoped to a single user's own tickets only.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("chat_support")
      .select("*")
      .eq("requested_by", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/chat/support
 *
 * Submits a new support ticket. requested_by and user_name are derived
 * server-side from the authenticated session/user_profiles — never trusted
 * from the client — so the admin dashboard's "Requested By" column always
 * reflects who actually sent the request.
 *
 * Body: {
 *   subject: string,
 *   message: string,
 *   priority?: "Low" | "Medium" | "High",   // defaults to "Low"
 *   category?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subject, message, priority, category } = await req.json();

    if (!subject || typeof subject !== "string") {
      return NextResponse.json(
        { error: "subject is required" },
        { status: 400 },
      );
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 },
      );
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: profile, error: profileError } = await admin
      .from("user_profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    const userName = profile
      ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
      : null;

    const { data, error } = await admin
      .from("chat_support")
      .insert([
        {
          requested_by: user.id,
          user_name: userName,
          subject,
          message,
          priority: priority || "Low",
          status: "Open",
          category: category ?? null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[chat/support POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
