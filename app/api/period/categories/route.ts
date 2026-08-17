import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Backs the "Topic" select on the Period Library content forms (manual
// create + AI generation) — see components/period_tracker/TopicCategorySelect.tsx.
export async function GET() {
  const user = await getAdminApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("period_content_categories")
    .select("slug,label")
    .order("sort_order");
  if (error) return NextResponse.json({ error: "Unable to load content categories" }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}
