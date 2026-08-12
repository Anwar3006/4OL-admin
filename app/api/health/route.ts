import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function envStatus(name: string) {
  return Boolean(process.env[name]) ? "configured" : "missing";
}

export async function GET() {
  const started = Date.now();

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("user_profiles")
      .select("user_id", { count: "exact", head: true });

    if (error) {
      console.error("[health] Supabase ping failed:", error.message);
      return NextResponse.json(
        {
          status: "degraded",
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - started,
          services: {
            api: "healthy",
            supabase: "unhealthy",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - started,
      services: {
        api: "healthy",
        supabase: "healthy",
        firebase: envStatus("FIREBASE_SERVICE_ACCOUNT_JSON"),
        twilio: envStatus("TWILIO_AUTH_TOKEN"),
        resend: envStatus("RESEND_API_KEY"),
        paystack: envStatus("PAYSTACK_SECRET_KEY"),
        googleMaps: envStatus("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
        gemini: envStatus("GEMINI_API_KEY"),
      },
    });
  } catch (err) {
    console.error("[health] Unexpected error:", err);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        latencyMs: Date.now() - started,
      },
      { status: 503 },
    );
  }
}
