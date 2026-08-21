import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("subscription_plans")
    .select(
      "id, name, slug, description, tier, price_monthly, price_yearly, currency, features, is_active, display_order",
    )
    .order("display_order", { ascending: true })
    .order("price_monthly", { ascending: true });

  if (error) {
    console.error("[settings/plans] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load subscription plans." },
      { status: 500 },
    );
  }

  return NextResponse.json({ plans: data ?? [] });
}
