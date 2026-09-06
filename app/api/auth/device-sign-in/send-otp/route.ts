import { NextRequest, NextResponse } from "next/server";
import { isEmailConfigured, missingEmailConfig, sendEmail } from "@/lib/email";

import { getAdminClient } from "@/lib/db/admin";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

function otpEmailHtml(code: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#102218">
      <h1 style="font-size:22px;margin:0 0 12px">Your 4 Our Life sign-in code</h1>
      <p style="margin:0 0 16px">Use this code to approve your new device.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${code}</p>
      <p style="margin:0;color:#63605c">This code expires when the current sign-in request expires. If you did not try to sign in, ignore this email and change your password from a trusted device.</p>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  // Checked before issuing a code: issuing one we cannot deliver would burn
  // the request's resend cooldown and leave the user waiting for an email
  // that is never coming.
  if (!isEmailConfigured()) {
    console.error(
      "[device-sign-in/send-otp] cannot send:",
      `set ${missingEmailConfig().join(" and ")}`,
    );
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestId: string | null = null;
  try {
    const body = await req.json();
    requestId = body?.request_id ?? null;
  } catch {
    requestId = null;
  }

  if (!requestId) {
    return NextResponse.json(
      { error: "request_id is required." },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await admin.rpc("issue_device_sign_in_otp", {
    p_request_id: requestId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("[device-sign-in/send-otp] RPC error:", error.message);
    return NextResponse.json(
      { error: "Could not issue verification code." },
      { status: 500 },
    );
  }

  if (!data?.ok) {
    const status =
      data?.reason === "not_found"
        ? 404
        : data?.reason === "rate_limited" ||
            data?.reason === "too_many_sends" ||
            data?.reason === "too_many_attempts"
          ? 429
          : 400;

    return NextResponse.json(
      { error: data?.reason ?? "Could not issue verification code." },
      { status },
    );
  }

  const sent = await sendEmail({
    to: data.email,
    subject: "Your 4 Our Life sign-in code",
    text: `Your 4 Our Life sign-in code is ${data.otp}. It expires when the current sign-in request expires.`,
    html: otpEmailHtml(data.otp),
  });

  if (!sent.success) {
    console.error("[device-sign-in/send-otp] send failed:", sent.error);
    return NextResponse.json(
      { error: "Failed to send verification code." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    email: maskEmail(data.email),
    expires_at: data.expires_at,
  });
}
