import "server-only";
import { render } from "@react-email/render";
import * as React from "react";
import { getAdminClient } from "@/lib/db/admin";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/aws-sms";
import { getTwilioClient, checkWhatsAppAvailability } from "@/lib/twilio";
import { formatPhoneNumber } from "@/lib/sms";
import { maskEmail, maskPhone } from "@/lib/masking";
import ProviderInviteEmail from "@/components/emails/provider-invite";
import type { CredentialDeliveryResult } from "@/features/providers/schema/types";

export interface DeliverProviderInviteArgs {
  userId: string;
  providerId: string;
  facilityName: string;
  email: string;
  phone: string;
  whatsapp?: string | null;
  /** The Twilio status webhook re-enters here after a WhatsApp send fails. */
  skipWhatsApp?: boolean;
}

/**
 * D8/D9: deliver a one-time sign-in link through email (always), WhatsApp
 * (when configured and the number is reachable) and SMS (fallback). Never
 * logs or stores the raw link/token — only a masked destination and the
 * provider's own message id, in credential_deliveries.
 *
 * Re-entrant by design: initial registration, "Resend invite" in the admin
 * UI, and the Twilio status webhook's async SMS fallback all call this same
 * function. Each call mints a FRESH magic link — we never persist the token,
 * so there is nothing to resend, only something new to send.
 */
export async function deliverProviderInvite(
  args: DeliverProviderInviteArgs,
): Promise<CredentialDeliveryResult[]> {
  const admin = getAdminClient();
  const results: CredentialDeliveryResult[] = [];

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: args.email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    throw new Error(
      `Could not generate an invite link: ${linkError?.message ?? "no hashed_token returned"}`,
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured; the invite was not sent.");
  }
  // Our own URL, never Supabase's action_link — a WhatsApp/email link
  // preview fetching action_link directly would consume the one-time token.
  const inviteLink =
    `${appUrl}/auth/welcome?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}` +
    `&type=magiclink`;

  const record = async (
    channel: CredentialDeliveryResult["channel"],
    status: CredentialDeliveryResult["status"],
    destinationMasked: string,
    providerMessageId?: string,
    error?: string,
  ) => {
    await admin.from("credential_deliveries").insert({
      user_id: args.userId,
      provider_id: args.providerId,
      channel,
      destination_masked: destinationMasked,
      status,
      provider_message_id: providerMessageId ?? null,
      error: error ?? null,
    });
    results.push({ channel, status, destinationMasked, error });
  };

  // ── Email: always ─────────────────────────────────────────────────────
  const html = await render(
    React.createElement(ProviderInviteEmail, {
      facilityName: args.facilityName,
      inviteLink,
    }),
  );
  const emailSent = await sendEmail({
    to: args.email,
    subject: "Welcome to 4 Our Life — set up your account",
    html,
  });
  await record(
    "email",
    emailSent.success ? "sent" : "failed",
    maskEmail(args.email),
    emailSent.success ? emailSent.messageId : undefined,
    emailSent.success ? undefined : emailSent.error,
  );

  // ── WhatsApp: first choice for phone, only when configured ─────────────
  const templateSid = process.env.TWILIO_PROVIDER_INVITE_TEMPLATE_SID;
  const whatsappNumber = args.whatsapp || args.phone;
  let whatsappOk = false;

  if (!args.skipWhatsApp && templateSid && whatsappNumber) {
    const formatted = formatPhoneNumber(whatsappNumber);
    const reachable = await checkWhatsAppAvailability(formatted).catch(() => false);
    if (reachable) {
      try {
        const statusCallback = `${appUrl}/api/webhooks/twilio-status`;
        const message = await getTwilioClient().messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${formatted}`,
          contentSid: templateSid,
          contentVariables: JSON.stringify({ "1": args.facilityName, "2": inviteLink }),
          statusCallback,
        });
        const failed = ["failed", "undelivered"].includes(message.status);
        await record(
          "whatsapp",
          failed ? "failed" : "sent",
          maskPhone(formatted),
          message.sid,
        );
        whatsappOk = !failed;
      } catch (err) {
        const message = err instanceof Error ? err.message : "WhatsApp send failed";
        await record("whatsapp", "failed", maskPhone(formatted), undefined, message);
      }
    } else {
      await record("whatsapp", "skipped", maskPhone(formatted), undefined, "not reachable on WhatsApp");
    }
  } else if (!args.skipWhatsApp && whatsappNumber) {
    await record(
      "whatsapp",
      "skipped",
      maskPhone(formatPhoneNumber(whatsappNumber)),
      undefined,
      "TWILIO_PROVIDER_INVITE_TEMPLATE_SID not configured",
    );
  }

  // ── SMS: fallback ────────────────────────────────────────────────────
  if (!whatsappOk) {
    const formatted = formatPhoneNumber(args.phone);
    const message = `4 Our Life: set up your account for ${args.facilityName}. ${inviteLink}`.slice(0, 160);
    const smsSent = await sendSMS(formatted, message);
    await record(
      "sms",
      smsSent.success ? "sent" : "failed",
      maskPhone(formatted),
      smsSent.success ? smsSent.messageId : undefined,
      smsSent.success ? undefined : smsSent.error,
    );
  }

  return results;
}
