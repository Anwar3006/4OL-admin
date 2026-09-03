/**
 * Shared service-health probe (Gap Analysis Part Y).
 * Consumed by /api/health and /api/admin/schematic so both surfaces stay
 * consistent. Never call from client components.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";

function envStatus(name: string) {
  return Boolean(process.env[name]) ? "configured" : "missing";
}

export interface PlatformHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  latencyMs: number;
  services: Record<string, string>;
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const started = Date.now();

  let supabaseStatus = "healthy";
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("user_profiles").select("user_id").limit(1);
    if (error) supabaseStatus = "unhealthy";
  } catch {
    supabaseStatus = "unhealthy";
  }

  const services: Record<string, string> = {
    api: "healthy",
    supabase: supabaseStatus,
    firebase: envStatus("FIREBASE_SERVICE_ACCOUNT_JSON"),
    twilio: envStatus("TWILIO_AUTH_TOKEN"),
    awsSms: envStatus("SMS_ORIGINATION_ID"),
    resend: envStatus("RESEND_API_KEY"),
    paystack: envStatus("PAYSTACK_SECRET_KEY"),
    googleMaps: envStatus("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),
    gemini: envStatus("GEMINI_API_KEY"),
  };

  const status =
    supabaseStatus === "healthy" ? "healthy" : "degraded";

  return {
    status,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - started,
    services,
  };
}
