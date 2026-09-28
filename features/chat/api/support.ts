import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";


import { getRequestUser } from "@/lib/mobile-auth";
const VALID_PRIORITIES = ["Low", "Medium", "High"];
const VALID_SATISFACTION_RATINGS = [1, 2, 3, 4, 5];

/**
 * GET /api/chat/support
 *
 * Returns the authenticated user's own support tickets (mobile "My
 * Tickets" view). Admin listing/management of ALL tickets goes through
 * the admin dashboard's direct Supabase hook (features/chat/data/useChat.ts),
 * not this route — this is scoped to a single user's own tickets only.
 */
export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("chat_support")
      .select("*")
      .eq("requested_by", user.id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tickets = data || [];

    // S6: chat_support.assigned_to is a bare user_profiles UUID. Resolve the
    // handling agent's display name so the mobile "My Tickets" card can show
    // *who* handled a ticket without a second client round-trip. Additive —
    // `assigned_agent_name` is a new response field.
    const agentIds = Array.from(
      new Set(
        tickets
          .map((t: any) => t.assigned_to)
          .filter((v: any): v is string => typeof v === "string" && v.length > 0),
      ),
    );
    let agentNames: Record<string, string> = {};
    if (agentIds.length > 0) {
      const { data: agents } = await admin
        .from("user_profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", agentIds);
      agentNames = (agents || []).reduce<Record<string, string>>((acc, a: any) => {
        const name = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
        if (a.user_id) acc[a.user_id] = name || "Support agent";
        return acc;
      }, {});
    }

    const enriched = tickets.map((t: any) => ({
      ...t,
      assigned_agent_name: t.assigned_to ? agentNames[t.assigned_to] ?? null : null,
    }));

    return NextResponse.json(enriched);
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
 *   tags?: string[],
 *   attachment_url?: string,   // S5: optional screenshot/file public URL
 *   attachment_name?: string,
 * }
 */
export async function POST(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subject, message, priority, category, tags, attachment_url, attachment_name } =
      await req.json();

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

    const admin = getAdminClient();

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
          tags: Array.isArray(tags) ? tags.filter((tag) => typeof tag === "string") : [],
          // S5: only sent when the caller actually attached a file, so a
          // pre-migration insert (no attachment) is unaffected.
          ...(typeof attachment_url === "string" && attachment_url
            ? {
                attachment_url,
                attachment_name:
                  typeof attachment_name === "string" ? attachment_name : null,
              }
            : {}),
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

/**
 * PATCH /api/chat/support
 *
 * Lets an authenticated mobile user rate one of their own resolved/closed
 * support tickets. Admin status/priority edits use the dashboard hooks.
 *
 * Body: {
 *   id: number,
 *   satisfaction_rating: 1 | 2 | 3 | 4 | 5
 * }
 */
export async function PATCH(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, satisfaction_rating } = await req.json();
    const ticketId = Number(id);
    const rating = Number(satisfaction_rating);

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return NextResponse.json(
        { error: "id must be a valid support ticket id" },
        { status: 400 },
      );
    }

    if (!VALID_SATISFACTION_RATINGS.includes(rating)) {
      return NextResponse.json(
        { error: "satisfaction_rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    const admin = getAdminClient();
    const { data: ticket, error: lookupError } = await admin
      .from("chat_support")
      .select("id, status, requested_by")
      .eq("id", ticketId)
      .eq("requested_by", user.id)
      .eq("is_deleted", false)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    if (ticket.status !== "Resolved") {
      return NextResponse.json(
        { error: "Only resolved support tickets can be rated" },
        { status: 400 },
      );
    }

    const { data, error } = await admin
      .from("chat_support")
      .update({
        satisfaction_rating: rating,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select()
      .single();

    if (error) {
      console.error("[chat/support PATCH] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
