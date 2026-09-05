import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";


// Backs the "Topic" select on the Period Library content forms (manual
// create + AI generation) — see features/period/ui/TopicCategorySelect.tsx.
export async function GET() {
  const auth = await requireAdminApiUser("period.content");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("period_content_categories")
    .select("slug,label")
    .order("sort_order");
  if (error) return NextResponse.json({ error: "Unable to load content categories" }, { status: 500 });
  return NextResponse.json({ categories: data ?? [] });
}
