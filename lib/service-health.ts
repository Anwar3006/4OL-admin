/**
 * Shared service-health probe (Gap Analysis Part Y).
 * Consumed by /api/health and /api/admin/schematic so both surfaces stay
 * consistent. Never call from client components.
 */

import { getAdminClient } from "@/lib/db/admin";

function envStatus(name: string) {
  return Boolean(process.env[name]) ? "configured" : "missing";
}

function envGroupStatus(names: string[]) {
  return names.every((name) => Boolean(process.env[name]))
    ? "configured"
    : "missing";
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
    const admin = getAdminClient();
    const { error } = await admin.from("user_profiles").select("user_id").limit(1);
    if (error) supabaseStatus = "unhealthy";
  } catch {
    supabaseStatus = "unhealthy";
  }

  const services: Record<string, string> = {
    api: "healthy",
    supabase: supabaseStatus,
    firebase: envStatus("FIREBASE_SERVICE_ACCOUNT_JSON"),
    twilio: envGroupStatus(["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"]),
    twilioVerify: envStatus("TWILIO_VERIFY_SERVICE_SID"),
    awsSms: envStatus("SMS_ORIGINATION_ID"),
    sendgrid: envGroupStatus(["SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL"]),
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
