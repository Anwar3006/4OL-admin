"use server";

import { initiateWhatsAppHandshake } from "@/lib/twilio";
import { sendSMS } from "@/lib/aws-sms";
import { formatPhoneNumber } from "@/lib/sms";

export async function notifyFacilityRegistration(formData: {
  facilityWhatsapp: string;
  facilityPhone: string;
  ownerPhone: string;
  facilityName: string;
  email: string;
  gpsAddress: string;
}) {
  const facilityWhatsapp = formatPhoneNumber(formData.facilityWhatsapp);
  const facilityPhone = formatPhoneNumber(formData.facilityPhone);
  const ownerPhone = formatPhoneNumber(formData.ownerPhone);
  const { facilityName, email, gpsAddress } = formData;

  const handshakeVariables = { "1": facilityName };

  // 1. Try Facility WhatsApp
  const res1 = await initiateWhatsAppHandshake(
    facilityWhatsapp,
    undefined,
    handshakeVariables,
    email,
    gpsAddress,
  );
  if (res1.success) return { channel: "whatsapp", recipient: "facility" };

  // 2. Try Facility Phone WhatsApp
  const res2 = await initiateWhatsAppHandshake(
    facilityPhone,
    undefined,
    handshakeVariables,
    email,
    gpsAddress,
  );
  if (res2.success) return { channel: "whatsapp", recipient: "facility" };

  // 3. Try Owner WhatsApp
  const res3 = await initiateWhatsAppHandshake(
    ownerPhone,
    undefined,
    handshakeVariables,
    email,
    gpsAddress,
  );
  if (res3.success) return { channel: "whatsapp", recipient: "owner" };

  // 4. Final Fallback: Owner SMS
  const message = `Success! ${facilityName} is now registered on 4 Our Life. Please check your email for the admin portal invite.`;
  const smsRes = await sendSMS(ownerPhone, message);
  if (smsRes.success) {
    return { channel: "sms", recipient: "owner" };
  }

  throw new Error("Failed to deliver notification to all channels.");
}
