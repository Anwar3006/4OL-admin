import { Twilio } from "twilio";
import { getAdminClient } from "./db/admin";

let client: Twilio | null = null;

export function getTwilioClient(): Twilio {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    const missing = [
      !accountSid ? "TWILIO_ACCOUNT_SID" : null,
      !authToken ? "TWILIO_AUTH_TOKEN" : null,
    ].filter(Boolean);
    throw new Error(`Twilio is not configured: set ${missing.join(" and ")}.`);
  }

  if (!client) client = new Twilio(accountSid, authToken);
  return client;
}

export async function initiateWhatsAppHandshake(
  to: string,
  contentSid: string | undefined,
  contentVariables: Record<string, string>,
  email: string,
  gpsAddress: string,
) {
  try {
    const supabaseAdmin = getAdminClient();
    const templateSid = contentSid || process.env.TWILIO_CONTENT_TEMPLATE_SID;
    
    if (!templateSid) {
      throw new Error("TWILIO_CONTENT_TEMPLATE_SID is not set.");
    }

    console.log("Sending to: ", `whatsapp:${to}`);

    const response = await getTwilioClient().messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid: templateSid,
      contentVariables: JSON.stringify(contentVariables),
    });

    // CRITICAL CHECK: Ensure the message didn't fail immediately
    // Valid initial statuses: 'queued', 'scheduled', 'sending', 'sent'
    const failedStatuses = ['failed', 'undelivered'];
    
    if (failedStatuses.includes(response.status)) {
      throw new Error(`Twilio rejected message immediately with status: ${response.status}`);
    }

    // Only store in DB if the message is at least 'queued'
    const { error: dbError } = await supabaseAdmin
      .from("twilio_whatsapp_handshakes")
      .insert({
        id: to,
        email: email,
        gps_address: gpsAddress,
        message_sid: response.sid,
        status: "handshake_sent",
      });

    if (dbError) throw dbError;

    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error(
      `WhatsApp attempt failed for ${to}:`,
      error.code || 'NO_CODE',
      error.message
    );
    
    return { 
      success: false, 
      code: error.code, 
      message: error.message 
    };
  }
}

export async function sendWhatsApp(to: string, message: string) {
  try {
    const formattedTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const response = await getTwilioClient().messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: formattedTo,
      body: message,
    });

    // console.log("Response: ", response);
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error("WhatsApp Error:", error);
    return { success: false, error };
  }
}

/**
 * Checks if a number is registered on WhatsApp using Twilio's Lookup API
 */
export async function checkWhatsAppAvailability(
  phone: string,
): Promise<boolean> {
  try {
    const lookup = await getTwilioClient().lookups.v2
      .phoneNumbers(phone)
      .fetch({
        fields: 'whatsapp',
      }) as any; // Cast to any to access the unmapped 'whatsapp' property

    // Now TypeScript won't complain about the property access
    return lookup.whatsapp?.registered ?? false;
  } catch (e) {
    console.error("WhatsApp Lookup Error:", e);
    return false; 
  }
}

// Plain SMS remains in lib/sms.ts. OTP verification uses this same Twilio
// client through Twilio Verify; WhatsApp continues to use it above.
