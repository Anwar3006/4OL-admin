import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { logSettingsChange } from "@/lib/settings-audit";

/**
 * Security tab persistence (Gap Analysis Part P, P-D3).
 * Shape lives in platform_settings.security_settings jsonb to avoid column
 * churn; zod-validated here on both read defaults and write.
 */
const SecuritySettingsSchema = z.object({
  mfa_required: z.boolean().default(false),
  ip_whitelist_enabled: z.boolean().default(false),
  ip_whitelist: z.array(z.string().trim().max(45)).max(100).default([]),
  session_timeout_mins: z.coerce.number().int().min(5).max(720).default(60),
  ai_audit_logging: z.boolean().default(true),
  geo_restriction_enabled: z.boolean().default(false),
});

type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;

const DEFAULTS: SecuritySettings = SecuritySettingsSchema.parse({});

// Compact IPv4 CIDR matcher for the self-lockout guard (P-D4). IPv6 entries
// are accepted but not evaluated here (no admin today works from one).
function ipToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255 || part === "") return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);
  if (ipLong === null || rangeLong === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

function clientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function GET() {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("security_settings")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    console.error("[settings/security] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load security settings." },
      { status: 500 },
    );
  }

  const parsed = SecuritySettingsSchema.safeParse(data?.security_settings ?? {});
  return NextResponse.json({ security: parsed.success ? parsed.data : DEFAULTS });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = SecuritySettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid security settings", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // P-D4 self-lockout guard: if the whitelist is being enforced, the acting
  // admin's own IP must fall inside it, otherwise nobody could ever log back
  // in to fix the mistake.
  const next = parsed.data;
  if (next.ip_whitelist_enabled && next.ip_whitelist.length > 0) {
    const actorIp = clientIp(req);
    const covered =
      actorIp !== null &&
      next.ip_whitelist.some((cidr) => ipInCidr(actorIp, cidr.trim()));
    if (!covered) {
      return NextResponse.json(
        {
          error:
            "IP whitelist rejected: your current IP is outside the new whitelist. Add your IP (or disable enforcement) before saving, so you don't lock yourself out.",
        },
        { status: 400 },
      );
    }
  }

  const admin = getAdminClient();
  const { data: previous } = await admin
    .from("platform_settings")
    .select("security_settings")
    .eq("id", "global")
    .maybeSingle();

  const { data, error } = await admin
    .from("platform_settings")
    .upsert({
      id: "global",
      security_settings: next,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("security_settings")
    .single();

  if (error) {
    console.error("[settings/security] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update security settings." },
      { status: 500 },
    );
  }

  await logSettingsChange(
    admin,
    user.id,
    "security",
    "security_settings",
    previous?.security_settings ?? null,
    next,
  );

  return NextResponse.json({ security: data.security_settings });
}
