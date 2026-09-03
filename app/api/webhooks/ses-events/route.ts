import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifySnsMessage } from "@/lib/sns-verify";

type SesBouncedRecipient = { emailAddress: string };
type SesEventMessage = {
  eventType: string;
  bounce?: { bounceType: "Permanent" | "Transient"; bouncedRecipients: SesBouncedRecipient[] };
  complaint?: { complainedRecipients: SesBouncedRecipient[] };
};

// AWS SES posts Bounce/Complaint/Delivery events to this endpoint via an SNS
// topic wired up as a configuration set event destination. Hard bounces and
// complaints get recorded in email_suppressions so future sends can skip
// known-bad addresses instead of relying solely on SES's own suppression list.
export async function POST(req: NextRequest) {
  // SNS sends Content-Type: text/plain even though the body is JSON.
  const raw = await req.text();
  const body = JSON.parse(raw) as Record<string, string>;

  const verified = await verifySnsMessage(body).catch(() => false);
  if (!verified) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 403 });
  }

  if (body.Type === "SubscriptionConfirmation") {
    await fetch(body.SubscribeURL); // visiting this URL is what confirms the subscription
    return NextResponse.json({ ok: true });
  }

  if (body.Type === "Notification") {
    const message = JSON.parse(body.Message) as SesEventMessage;
    const admin = getSupabaseAdmin();

    if (message.eventType === "Bounce" && message.bounce && message.bounce.bounceType === "Permanent") {
      const rows = message.bounce.bouncedRecipients.map((r: SesBouncedRecipient) => ({
        email: r.emailAddress.toLowerCase(),
        reason: "hard_bounce" as const,
        source_event: message,
      }));
      await admin.from("email_suppressions").upsert(rows, { onConflict: "email" });
    }

    if (message.eventType === "Complaint" && message.complaint) {
      const rows = message.complaint.complainedRecipients.map((r: SesBouncedRecipient) => ({
        email: r.emailAddress.toLowerCase(),
        reason: "complaint" as const,
        source_event: message,
      }));
      await admin.from("email_suppressions").upsert(rows, { onConflict: "email" });
    }
  }

  return NextResponse.json({ ok: true });
}
