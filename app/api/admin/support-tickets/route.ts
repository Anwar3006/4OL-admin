import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getServerClient } from "@/lib/db/server";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("chats.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? String(DEFAULT_LIMIT));
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;

  const supabase = await getServerClient();
  const { data, error } = await supabase.rpc("get_admin_support_tickets", {
    p_limit: limit,
    p_offset: (safePage - 1) * limit,
  });

  if (error) {
    console.error("[admin/support-tickets] list error:", error.message);
    return NextResponse.json({ error: "Failed to load support tickets." }, { status: 500 });
  }

  const tickets = (data ?? []).map((ticket: Record<string, unknown>) => ({
    ...ticket,
    user_profiles: ticket.requested_by
      ? {
          first_name: ticket.first_name ?? null,
          last_name: ticket.last_name ?? null,
          phone_number: ticket.phone_number ?? null,
        }
      : null,
  }));
  const total = Number(tickets[0]?.total_count ?? 0);

  return NextResponse.json({
    tickets,
    meta: {
      currentPage: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
