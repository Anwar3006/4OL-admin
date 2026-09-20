import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { getAdminClient } from "@/lib/db/admin";
import { deliverProviderInvite } from "@/lib/provider-invite";

// Twilio posts delivery status for the WhatsApp provider-invite message here
// (statusCallback set in lib/provider-invite.ts). On failed/undelivered we
// trigger the SMS fallback — deliverProviderInvite() mints a fresh link
// rather than resending the original, since credential_deliveries
// deliberately never stores the token to resend.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get("x-twilio-signature");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!authToken || !signature || !appUrl) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const webhookUrl = `${appUrl}/api/webhooks/twilio-status`;
  const valid = twilio.validateRequestWithBody(authToken, signature, webhookUrl, rawBody);
  if (!valid) {
    console.warn("[twilio-status] invalid signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }

  const params = new URLSearchParams(rawBody);
  const messageSid = params.get("MessageSid");
  const messageStatus = params.get("MessageStatus");
  if (!messageSid || !messageStatus) {
    return NextResponse.json({ ok: true }); // not a delivery-status callback we care about
  }

  const admin = getAdminClient();
  const { data: delivery, error } = await admin
    .from("credential_deliveries")
    .update({ status: messageStatus })
    .eq("provider_message_id", messageSid)
    .eq("channel", "whatsapp")
    .select("id, user_id, provider_id, status")
    .maybeSingle();

  if (error || !delivery) {
    return NextResponse.json({ ok: true }); // nothing to correlate — not an error
  }

  const failed = messageStatus === "failed" || messageStatus === "undelivered";
  if (failed) {
    const { data: facility } = await admin
      .from("facility_profile")
      .select("id, facility_name, owner_email, person_contact_number")
      .eq("owner_id", delivery.user_id)
      .eq("id", delivery.provider_id ?? "")
      .maybeSingle();

    if (facility) {
      await deliverProviderInvite({
        userId: delivery.user_id,
        providerId: facility.id,
        facilityName: facility.facility_name,
        email: facility.owner_email,
        phone: facility.person_contact_number,
        skipWhatsApp: true,
      }).catch((err) => {
        console.error("[twilio-status] SMS fallback failed:", err);
      });
    }
  }

  return NextResponse.json({ ok: true });
}
