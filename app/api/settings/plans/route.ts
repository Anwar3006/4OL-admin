import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
