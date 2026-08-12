import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/lib/admin-api-auth";

const defaultSecuritySettings = {
  password_policy: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false,
  },
  session_timeout: 3600,
  max_login_attempts: 5,
  lockout_duration: 900,
  require_2fa: false,
  allowed_ips: [],
  mfa_methods: ["totp"],
  source: "defaults" as const,
};

export async function GET() {
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    security: defaultSecuritySettings,
  });
}
