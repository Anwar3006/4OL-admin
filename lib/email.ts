import { Resend } from "resend";

/**
 * The one transactional email sender: Resend.
 *
 * Admin invites, login alerts, device sign-in codes, and support messages all
 * use this wrapper so configuration and delivery failures behave consistently.
 *
 * Required configuration:
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL       a sender on a domain verified in Resend
 */

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

/** Which required variables are missing. Empty means Resend can be attempted. */
export function missingEmailConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.RESEND_API_KEY) missing.push("RESEND_API_KEY");
  if (!process.env.RESEND_FROM_EMAIL) missing.push("RESEND_FROM_EMAIL");
  return missing;
}

export function isEmailConfigured(): boolean {
  return missingEmailConfig().length === 0;
}

// Lazily constructed. At module scope this would build a client during the
// build, when no environment is loaded — the mistake lib/supabase/indexAdmin.ts
// made with a service-role client.
let client: Resend | null = null;
function getClient(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
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

  try {
    const { data, error } = await getClient().emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.text ? { text: args.text } : {}),
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });

    if (error) {
      console.error("[email] Resend send failed:", {
        name: error.name,
        message: error.message,
        to: args.to,
      });
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    const err = error as { name?: string; message?: string };
    console.error("[email] Resend send failed:", {
      name: err.name,
      message: err.message,
      to: args.to,
    });
    return { success: false, error: err.message || "Failed to send email" };
  }
}
