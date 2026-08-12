import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const envKeyMap = [
  { name: "Google Maps", provider: "google", env: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" },
  { name: "Twilio", provider: "twilio", env: "TWILIO_AUTH_TOKEN" },
  { name: "Resend", provider: "resend", env: "RESEND_API_KEY" },
  { name: "Paystack", provider: "paystack", env: "PAYSTACK_SECRET_KEY" },
  { name: "Gemini", provider: "gemini", env: "GEMINI_API_KEY" },
  { name: "Firebase Admin", provider: "firebase", env: "FIREBASE_SERVICE_ACCOUNT_JSON" },
];

function maskEnvValue(value: string | undefined) {
  if (!value) return null;
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("platform_api_keys")
    .select("id, name, provider, environment, key_hint, active, last_used, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[settings/api-keys] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load API key metadata." },
      { status: 500 },
    );
  }

  const envKeys = envKeyMap.map((key) => ({
    id: `env:${key.env}`,
    name: key.name,
    provider: key.provider,
    environment: key.env.startsWith("NEXT_PUBLIC_") ? "client-public" : "server",
    key_hint: maskEnvValue(process.env[key.env]),
    active: Boolean(process.env[key.env]),
    last_used: null,
    created_at: null,
    source: "environment",
  }));

  const storedKeys = (data ?? []).map((key) => ({
    ...key,
    source: "database",
  }));

  return NextResponse.json({ keys: [...envKeys, ...storedKeys] });
}
