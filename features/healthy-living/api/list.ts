import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const isMissingEngagementTable = (error: { code?: string; message?: string } | null) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        error.message?.includes("content_engagement")),
  );

/**
 * Admin Healthy Living list with per-article engagement. Engagement is read
 * server-side because content_engagement is deliberately service-role only.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("healthyliving.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 10),
  );
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status") ?? "";
  const from = (page - 1) * limit;
  const admin = getAdminClient();

  let query = admin
    .from("healthy_living_info")
    .select(
      "*, healthy_living_categories(category_id, categories(id, name))",
      { count: "exact" },
    );

  if (search) query = query.ilike("name", `%${search}%`);
  if (status) query = query.eq("status", status);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const ids = rows.map((row) => row.id);
  const likesById = new Map<string, number>();
  const savesById = new Map<string, number>();
  const reads30dById = new Map<string, number>();
  let engagementPipelineLive = true;

  if (ids.length > 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [engagementResult, viewsResult] = await Promise.all([
      admin
        .from("content_engagement")
        .select("content_id, action")
        .eq("content_type", "healthy_living")
        .in("content_id", ids),
      admin
        .from("healthy_living_views")
        .select("healthy_living_id")
        .in("healthy_living_id", ids)
        .gte("created_at", thirtyDaysAgo),
    ]);

    if (engagementResult.error) {
      if (!isMissingEngagementTable(engagementResult.error)) {
        return NextResponse.json(
          { error: engagementResult.error.message },
          { status: 500 },
        );
      }
      engagementPipelineLive = false;
    } else {
      for (const item of engagementResult.data ?? []) {
        const target = item.action === "like" ? likesById : savesById;
        target.set(item.content_id, (target.get(item.content_id) ?? 0) + 1);
      }
    }

    if (viewsResult.error) {
      return NextResponse.json({ error: viewsResult.error.message }, { status: 500 });
    }
    for (const item of viewsResult.data ?? []) {
      reads30dById.set(
        item.healthy_living_id,
        (reads30dById.get(item.healthy_living_id) ?? 0) + 1,
      );
    }
  }

  const healthyLivings = rows.map((row: any) => {
    const { healthy_living_categories, ...article } = row;
    return {
      ...article,
      categories:
        healthy_living_categories?.map((item: any) => item.categories?.name).filter(Boolean) ?? [],
      categoryRefs: healthy_living_categories ?? [],
      reads_30d: reads30dById.get(row.id) ?? 0,
      like_count: likesById.get(row.id) ?? 0,
      save_count: savesById.get(row.id) ?? 0,
    };
  });

  const total = count ?? 0;
  return NextResponse.json({
    healthyLivings,
    engagementPipelineLive,
    meta: {
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    },
  });
}
