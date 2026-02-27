import { Twilio } from "twilio";
import { supabaseAdmin } from "./supabase/indexAdmin";

export const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!,
);

export async function initiateWhatsAppHandshake(
  to: string,
  contentSid: string,
  contentVariables: string,
  email: string,
  gpsAddress: string,
) {
  try {
    const response = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      contentSid: contentSid,
      contentVariables: contentVariables,
    });

    //store to, email, gpsAddress, response.sid in DB, needed by webhook to send credentials when user
    await supabaseAdmin.from("twilio_whatsapp_handshakes").insert({
      id: to,
      email: email,
      gps_address: gpsAddress,
      message_sid: response.sid,
      status: "handshake_sent",
    });
    return { success: true, sid: response.sid };
  } catch (error: any) {
    // Error 63003: "Channel user is not registered on WhatsApp"
    // Error 63007: "Twilio Sandbox limit" or other channel specific errors
    console.error(
      `WhatsApp attempt failed for ${to}:`,
      error.code,
      error.message,
    );
    return { success: false, code: error.code, message: error.message };
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
    const response = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: to,
      body: message,
    });
    return { success: true, sid: response.sid };
  } catch (error) {
    console.error("SMS Error:", error);
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
    // Note: Twilio Lookup v2 is best for this
    const lookup = await client.lookups.v2.phoneNumbers(phone).fetch({
      fields: "line_type_intelligence",
    });
    return lookup.lineTypeIntelligence?.type === "mobile";
  } catch (e) {
    return false; // Default to false if check fails
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
