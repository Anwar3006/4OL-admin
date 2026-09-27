import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("fitness.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  // Provider identity is canonical. This deliberately replaces the legacy
  // fitness_trainers-first registry, which omitted gyms and event organisers.
  const providerQuery = new URL(req.url);
  const providerPage = Math.max(1, parseInt(providerQuery.searchParams.get("page") ?? "1", 10) || 1);
  const providerLimit = Math.min(100, Math.max(1, parseInt(providerQuery.searchParams.get("limit") ?? "20", 10) || 20));
  const providerSearch = providerQuery.searchParams.get("search")?.trim();
  const providers = admin
    .from("providers")
    .select("id, name, owner_id, status, rating_average, rating_count, provider_type, provider_types!inner(label), fitness_trainers(provider_id, specialties, years_experience, total_sessions, total_clients)", { count: "exact" })
    .eq("kind", "trainer")
    .order("created_at", { ascending: false });
  if (providerSearch) providers.ilike("name", `%${providerSearch}%`);
  const { data: providerRows, count: providerCount, error: providerError } = await providers.range((providerPage - 1) * providerLimit, providerPage * providerLimit - 1);
  if (providerError) return NextResponse.json({ error: providerError.message }, { status: 500 });
  const ownerIds = (providerRows ?? []).map((row: any) => row.owner_id).filter(Boolean);
  const programmeCounts = new Map<string, number>();
  if (ownerIds.length) {
    const { data: plans } = await admin.from("fitness_plans").select("author_id").in("author_id", ownerIds).eq("status", "published");
    for (const plan of plans ?? []) programmeCounts.set((plan as any).author_id, (programmeCounts.get((plan as any).author_id) ?? 0) + 1);
  }
  return NextResponse.json({
    trainers: (providerRows ?? []).map((row: any) => {
      const details = Array.isArray(row.fitness_trainers) ? row.fitness_trainers[0] : row.fitness_trainers;
      const type = Array.isArray(row.provider_types) ? row.provider_types[0] : row.provider_types;
      return { id: row.id, name: row.name, type: type?.label ?? row.provider_type, status: row.status, rating_average: row.rating_average, rating_count: row.rating_count ?? 0, specialties: details?.specialties ?? [], years_experience: details?.years_experience ?? null, total_sessions: details?.total_sessions ?? 0, total_clients: details?.total_clients ?? 0, programmes_count: programmeCounts.get(row.owner_id) ?? 0 };
    }),
    meta: { total: providerCount ?? 0, totalPages: Math.ceil((providerCount ?? 0) / providerLimit), currentPage: providerPage },
  });

}
