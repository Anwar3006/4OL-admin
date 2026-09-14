import sgMail from "@sendgrid/mail";

/**
 * The one transactional email sender: Twilio SendGrid.
 *
 * Admin invites, login alerts, device sign-in codes, and support messages all
 * use this wrapper so configuration and delivery failures behave consistently.
 *
 * Required configuration:
 *   SENDGRID_API_KEY
 *   SENDGRID_FROM_EMAIL     a sender on a domain authenticated in SendGrid
 *   SENDGRID_FROM_NAME      optional; defaults to "4 Our Life"
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

/** Which required variables are missing. Empty means SendGrid can be attempted. */
export function missingEmailConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.SENDGRID_API_KEY) missing.push("SENDGRID_API_KEY");
  if (!process.env.SENDGRID_FROM_EMAIL) missing.push("SENDGRID_FROM_EMAIL");
  return missing;
}

export function isEmailConfigured(): boolean {
  return missingEmailConfig().length === 0;
}

// Configure lazily so importing a route during `next build` never requires
// production credentials. Keep the key that configured the singleton so test
// and local environment changes cannot accidentally reuse a stale client.
let configuredApiKey: string | null = null;
function getClient() {
  const apiKey = process.env.SENDGRID_API_KEY!;
  if (configuredApiKey !== apiKey) {
    sgMail.setApiKey(apiKey);
    configuredApiKey = apiKey;
  }
  return sgMail;
}

function sendGridErrorMessage(error: unknown): string {
  const candidate = error as {
    message?: string;
    response?: { body?: { errors?: Array<{ message?: string }> } };
  };
  const apiMessages = candidate.response?.body?.errors
    ?.map((item) => item.message)
    .filter(Boolean);
  return apiMessages?.length
    ? apiMessages.join("; ")
    : candidate.message || "Failed to send email";
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
    const [response] = await getClient().send({
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: process.env.SENDGRID_FROM_NAME || "4 Our Life",
      },
      to: args.to,
      subject: args.subject,
      html: args.html,
      ...(args.text ? { text: args.text } : {}),
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });
    const header = response.headers?.["x-message-id"];
    const messageId = Array.isArray(header) ? header[0] : header;
    return { success: true, ...(messageId ? { messageId } : {}) };
  } catch (error) {
    const message = sendGridErrorMessage(error);
    console.error("[email] SendGrid send failed:", {
      message,
      to: args.to,
    });
    return { success: false, error: message };
  }
}
