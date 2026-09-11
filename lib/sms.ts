import { getTwilioClient } from "./twilio";

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

/**
 * Sends and verifies phone OTPs through Twilio Verify. The public API shape is
 * unchanged so the mobile clients do not need a provider-specific change.
 */
export async function sendVerificationCode(phoneNumber: string) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) {
    return {
      success: false,
      error: "Twilio Verify is not configured: set TWILIO_VERIFY_SERVICE_SID.",
    };
  }

  try {
    const verification = await getTwilioClient().verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    return {
      success: true,
      status: verification.status,
      sid: verification.sid,
    };
  } catch (error) {
    const err = error as { message?: string };
    console.error("Twilio Verify send error:", err.message);
    return {
      success: false,
      error: err.message || "Failed to send verification code",
    };
  }
}

export async function checkVerificationCode(phoneNumber: string, code: string) {
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) {
    return {
      success: false,
      error: "Twilio Verify is not configured: set TWILIO_VERIFY_SERVICE_SID.",
    };
  }

  try {
    const verification = await getTwilioClient().verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code,
      });

    return {
      success: verification.status === "approved",
      status: verification.status,
      valid: verification.valid,
    };
  } catch (error) {
    const err = error as { message?: string };
    console.error("Twilio Verify check error:", err.message);
    return {
      success: false,
      error: err.message || "Failed to verify code",
    };
  }
}
