import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

/**
 * GET /api/fitness/trainers — list (paginated/searchable via ?page/&limit/&search)
 * or a single trainer (?id=) with user_profiles + email resolved.
 *
 * user_profiles has no email column (same bug already fixed in
 * features/marketing/api/subscribers.ts and features/delete-account-requests/api/list.ts):
 * asking for it inside the `user_profiles!fitness_trainers_user_id_fkey(...)`
 * embed fails the WHOLE query — "column user_profiles_1.email does not
 * exist" — which 500'd the Trainers tab. Email lives in auth.users, which
 * PostgREST can't reach and which needs the service role, so this moved out
 * of the browser hook (useTrainer.ts used getBrowserClient() directly) into
 * this admin API route.
 */

const SELECT =
  "*, user_profiles!fitness_trainers_user_id_fkey(user_id, first_name, last_name, avatar_url)";

type ProfileRow = { user_id: string; first_name: string; last_name: string; avatar_url: string | null };
type TrainerRow = Record<string, unknown> & { user_profiles: ProfileRow | null };

async function resolveEmails(admin: ReturnType<typeof getAdminClient>, userIds: string[]) {
  const wanted = new Set(userIds);
  const emailById = new Map<string, string | null>();
  for (let page = 1; page <= 10 && emailById.size < wanted.size; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if (wanted.has(u.id)) emailById.set(u.id, u.email ?? null);
    }
  }
  return emailById;
}

function withEmail(row: TrainerRow, emailById: Map<string, string | null>) {
  if (!row.user_profiles) return row;
  return {
    ...row,
    user_profiles: {
      ...row.user_profiles,
      email: emailById.get(row.user_profiles.user_id) ?? null,
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("fitness.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    const { data, error } = await admin
      .from("fitness_trainers")
      .select(SELECT)
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const row = data as unknown as TrainerRow;
    const emailById = await resolveEmails(admin, row.user_profiles ? [row.user_profiles.user_id] : []);
    return NextResponse.json(withEmail(row, emailById));
  }

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));
  const search = url.searchParams.get("search") ?? "";
  const from = (page - 1) * limit;

  let query = admin
    .from("fitness_trainers")
    .select(SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `user_profiles.first_name.ilike.%${search}%,user_profiles.last_name.ilike.%${search}%`,
    );
  }

  const { data, count, error } = await query.range(from, from + limit - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as TrainerRow[];
  const userIds = rows.map((r) => r.user_profiles?.user_id).filter(Boolean) as string[];
  const emailById = await resolveEmails(admin, userIds);
  const trainers = rows.map((r) => withEmail(r, emailById));

  const total = count ?? 0;
  return NextResponse.json({
    trainers,
    meta: { total, totalPages: Math.ceil(total / limit), currentPage: page },
  });
}
