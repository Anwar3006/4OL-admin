import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

/**
 * The one transactional email sender: AWS SES v2.
 *
 * This replaces `@sendgrid/mail`, which three call sites still used after the
 * platform moved to AWS — the device sign-in OTP, admin login alerts and admin
 * invites. SendGrid was the *only* path for all three, and
 * `SENDGRID_API_KEY` was set in no env file and documented in no
 * `.env.example`, so every one of them was failing its own configuration
 * guard and returning "Email service is not configured."
 *
 * Shaped to match `lib/sms.ts` (AWS End User Messaging SMS): same region
 * variable, same `{ success, error }` return rather than throwing, because
 * every caller here treats delivery as best-effort or handles failure itself.
 *
 * ── Required configuration ────────────────────────────────────────────────
 *
 *   AWS_REGION              e.g. eu-west-1 — the SES region, which must be
 *                           the region the sender identity is verified in
 *   SES_FROM_EMAIL          the From address; MUST be a verified SES identity
 *   AWS_ACCESS_KEY_ID       omit both if the runtime supplies a role
 *   AWS_SECRET_ACCESS_KEY
 *   SES_CONFIGURATION_SET   optional — for bounce/complaint tracking
 *
 * None of these were set when this was written. `isEmailConfigured()` exists
 * so callers can say so precisely instead of failing with a generic AWS error
 * five frames deep, and `sendEmail` names the missing variable rather than
 * reporting a credentials problem.
 *
 * ⚠️ While a new SES account is in the sandbox it can only send to verified
 * addresses. A send to an unverified recipient fails with
 * `MessageRejected: Email address is not verified`, which is a real AWS error
 * and not a bug here.
 */

const FROM_FALLBACK = "life@4ourlife.com";

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Worth setting — some clients rank mail without it as spam. */
  text?: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { success: true; messageId?: string }
  | { success: false; error: string };

/** Which required variables are missing. Empty means SES can be attempted. */
export function missingEmailConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.AWS_REGION) missing.push("AWS_REGION");
  if (!process.env.SES_FROM_EMAIL) missing.push("SES_FROM_EMAIL");
  return missing;
}

export function isEmailConfigured(): boolean {
  return missingEmailConfig().length === 0;
}

// Lazily constructed. At module scope this would build a client during the
// build, when no environment is loaded — the mistake lib/supabase/indexAdmin.ts
// made with a service-role client.
let client: SESv2Client | null = null;
function getClient(): SESv2Client {
  if (!client) client = new SESv2Client({ region: process.env.AWS_REGION });
  return client;
}

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const missing = missingEmailConfig();
  if (missing.length > 0) {
    // Named, so the log says what to set rather than "credentials error".
    const error = `Email is not configured: set ${missing.join(" and ")}.`;
    console.error("[email]", error);
    return { success: false, error };
  }

  const from = process.env.SES_FROM_EMAIL || FROM_FALLBACK;

  try {
    const response = await getClient().send(
      new SendEmailCommand({
        FromEmailAddress: from,
        Destination: { ToAddresses: [args.to] },
        ReplyToAddresses: args.replyTo ? [args.replyTo] : undefined,
        ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
        Content: {
          Simple: {
            Subject: { Data: args.subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: args.html, Charset: "UTF-8" },
              ...(args.text
                ? { Text: { Data: args.text, Charset: "UTF-8" } }
                : {}),
            },
          },
        },
      }),
    );
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    const err = error as { name?: string; message?: string };
    console.error("[email] SES send failed:", {
      name: err.name,
      message: err.message,
      to: args.to,
    });
    return { success: false, error: err.message || "Failed to send email" };
  }
}
