import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("subscription_tiers")
    .select(
      "id, key, name, description, price_ghs, duration_days, benefits, is_active, display_order",
    )
    .order("display_order", { ascending: true })
    .order("price_ghs", { ascending: true });

  if (error) {
    console.error("[settings/plans] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load subscription plans." },
      { status: 500 },
    );
  }

  return NextResponse.json({ plans: data ?? [] });
}
