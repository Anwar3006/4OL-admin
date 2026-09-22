import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db/admin";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  // Query expiring credentials that are 30, 7, or 1 days away from expiry.
  // user_profiles has no `email` column — it lives only in auth.users, which
  // PostgREST does not expose (see lib/db/README.md). Pull first_name here,
  // and resolve email per owner via the admin auth API below.
  const { data, error } = await admin
    .from("provider_credentials")
    .select(`
      id,
      credential_type,
      expires_at,
      providers!inner (
        id,
        name,
        owner_id,
        user_profiles!inner (
          first_name
        )
      )
    `)
    .eq("status", "verified")
    .not("expires_at", "is", null);

  if (error) {
    console.error("[provider-credential-reminders] failed to fetch credentials:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = new Date();
  // Strip time for accurate day difference
  today.setHours(0, 0, 0, 0);

  const expiringCredentials = (data || []).filter((cred: any) => {
    if (!cred.expires_at) return false;
    const expiryDate = new Date(cred.expires_at);
    expiryDate.setHours(0, 0, 0, 0);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return [30, 7, 1].includes(diffDays);
  });

  // Resolve email per distinct owner via the admin auth API (auth.users,
  // not user_profiles — see the comment above the query). Cached so a
  // provider with several expiring credentials only costs one lookup.
  const emailByOwnerId = new Map<string, string | null>();
  async function resolveOwnerEmail(ownerId: string): Promise<string | null> {
    if (emailByOwnerId.has(ownerId)) return emailByOwnerId.get(ownerId) ?? null;
    const { data: authRes, error: authError } = await admin.auth.admin.getUserById(ownerId);
    if (authError) {
      console.error(`[provider-credential-reminders] getUserById failed for ${ownerId}:`, authError.message);
    }
    const email = authRes?.user?.email ?? null;
    emailByOwnerId.set(ownerId, email);
    return email;
  }

  const emailsSent: string[] = [];

  for (const cred of expiringCredentials) {
    const provider = Array.isArray(cred.providers) ? cred.providers[0] : cred.providers;
    if (!provider) continue;

    const owner = Array.isArray(provider.user_profiles)
      ? provider.user_profiles[0]
      : provider.user_profiles;

    const ownerEmail = await resolveOwnerEmail(provider.owner_id);
    if (!ownerEmail) continue;

    const expiryDate = new Date(cred.expires_at).toISOString().split("T")[0];
    const credentialLabel = cred.credential_type.replace(/_/g, " ").toUpperCase();
    const facilityName = provider.name;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Credential Expiring Soon</h2>
        <p>Hello ${owner?.first_name || 'Provider'},</p>
        <p>This is a reminder that the <strong>${credentialLabel}</strong> for <strong>${facilityName}</strong> will expire on <strong>${expiryDate}</strong>.</p>
        <p>Please log in to your dashboard to upload your renewed credentials to avoid any interruption in your verified status.</p>
        <br/>
        <p>Best regards,</p>
        <p>4 Our Life Team</p>
      </div>
    `;

    const result = await sendEmail({
      to: ownerEmail,
      subject: `Action Required: ${credentialLabel} Expiring Soon`,
      html,
    });

    if (result.success) {
      emailsSent.push(cred.id);
    } else {
      console.error(`[provider-credential-reminders] failed to send email to ${ownerEmail}`);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: expiringCredentials.length,
    emailsSent: emailsSent.length,
  });
}
