import crypto from "node:crypto";
import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2";
import { supabaseAdmin } from "./supabase/indexAdmin";

const smsClient = new PinpointSMSVoiceV2Client({ region: process.env.AWS_REGION });

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

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

export async function sendSMS(to: string, message: string) {
  try {
    const response = await smsClient.send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: to,
        OriginationIdentity: process.env.SMS_ORIGINATION_ID,
        MessageBody: message,
        MessageType: "TRANSACTIONAL",
        ConfigurationSetName: process.env.SMS_CONFIG_SET,
      }),
    );
    return { success: true, messageId: response.MessageId };
  } catch (error: any) {
    console.error("SMS Error Details:", {
      name: error.name,
      message: error.message,
    });
    return { success: false, error: error.message || "Failed to send SMS" };
  }
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Generates and sends a 6-digit verification code. Twilio Verify used to
 * generate, store, and check these codes for us — that logic now lives here
 * and in checkVerificationCode(), backed by the otp_verifications table.
 */
export async function sendVerificationCode(phoneNumber: string) {
  try {
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { error: dbError } = await supabaseAdmin.from("otp_verifications").insert({
      phone_number: phoneNumber,
      otp_code: hashOtp(code),
      expires_at: expiresAt,
      verified: false,
      attempts: 0,
    });
    if (dbError) throw dbError;

    const smsResult = await sendSMS(
      phoneNumber,
      `Your Our Life verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    );
    if (!smsResult.success) throw new Error(smsResult.error);

    return { success: true, status: "pending" };
  } catch (error: any) {
    console.error("Verification code send error:", error);
    return {
      success: false,
      error: error.message || "Failed to send verification code",
    };
  }
}

/**
 * Checks a verification code against the most recent unverified,
 * unexpired code for this phone number, enforcing a max attempt count
 * (Twilio Verify did this internally; AWS SNS has no equivalent).
 */
export async function checkVerificationCode(phoneNumber: string, code: string) {
  try {
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from("otp_verifications")
      .select("id, otp_code, attempts")
      .eq("phone_number", phoneNumber)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!pending) {
      return { success: false, status: "expired", error: "Code has expired or was never sent" };
    }

    if (pending.attempts >= OTP_MAX_ATTEMPTS) {
      return { success: false, status: "max_attempts_reached", error: "Too many incorrect attempts" };
    }

    const matches = pending.otp_code === hashOtp(code);

    if (!matches) {
      await supabaseAdmin
        .from("otp_verifications")
        .update({ attempts: pending.attempts + 1 })
        .eq("id", pending.id);
      return { success: false, status: "denied", valid: false, error: "Invalid verification code" };
    }

    await supabaseAdmin.from("otp_verifications").update({ verified: true }).eq("id", pending.id);

    return { success: true, status: "approved", valid: true };
  } catch (error: any) {
    console.error("Verification code check error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify code",
    };
  }
}
