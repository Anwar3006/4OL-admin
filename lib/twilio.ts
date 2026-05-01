import { Twilio } from "twilio";
import { supabaseAdmin } from "./supabase/indexAdmin";

export const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export async function initiateWhatsAppHandshake(
  to: string,
  contentSid: string | undefined,
  contentVariables: Record<string, string>,
  email: string,
  gpsAddress: string,
) {
  try {
    const templateSid = contentSid || process.env.TWILIO_CONTENT_TEMPLATE_SID;
    
    if (!templateSid) {
      throw new Error("TWILIO_CONTENT_TEMPLATE_SID is not set.");
    }

    console.log("Sending to: ", `whatsapp:${to}`);

    const response = await client.messages.create({
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

    const response = await client.messages.create({
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

export async function sendSMS(to: string, message: string) {
  try {
    const fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromPhoneNumber) {
      console.warn("TWILIO_PHONE_NUMBER is not set in environment variables. Falling back to TWILIO_WHATSAPP_NUMBER for SMS.");
    }

    const response = await client.messages.create({
      from: fromPhoneNumber || process.env.TWILIO_WHATSAPP_NUMBER,
      to: to,
      body: message,
    });
    return { success: true, sid: response.sid };
  } catch (error: any) {
    console.error("SMS Error Details:", {
      status: error.status,
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo
    });
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
    const lookup = await client.lookups.v2
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

/**
 * Send a verification code using Twilio Verify API
 */
export async function sendVerificationCode(phoneNumber: string) {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    return {
      success: true,
      status: verification.status,
      sid: verification.sid,
    };
  } catch (error: any) {
    console.error("Twilio Verify send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send verification code",
    };
  }
}

/**
 * Check a verification code using Twilio Verify API
 */
export async function checkVerificationCode(
  phoneNumber: string,
  code: string,
) {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      });

    return {
      success: verificationCheck.status === "approved",
      status: verificationCheck.status,
      valid: verificationCheck.valid,
    };
  } catch (error: any) {
    console.error("Twilio Verify check error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify code",
    };
  }
}

export const formatPhoneNumber = (contact: string): string => {
  // Remove any spaces or special characters
  const cleanContact = contact.replace(/\s/g, '');
  
  // If it starts with +, return as is
  if (cleanContact.startsWith("+")) return cleanContact;
  
  // If it starts with 0, replace with +233
  if (cleanContact.startsWith("0")) {
    return "+233" + cleanContact.substring(1);
  }
  
  // If it's a valid Ghanaian number without prefix (10 digits starting with 2, 5, or 9)
  if (cleanContact.length === 9 && /^[259]/.test(cleanContact)) {
    return "+233" + cleanContact;
  }
  
  return cleanContact;
};