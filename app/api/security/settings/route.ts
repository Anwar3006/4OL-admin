import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";

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
  const auth = await requireAdminApiUser("security.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  return NextResponse.json({
    security: defaultSecuritySettings,
  });
}
