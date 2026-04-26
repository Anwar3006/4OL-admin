"use server";

import {
  initiateWhatsAppHandshake,
  sendSMS,
  checkWhatsAppAvailability,
} from "@/lib/twilio";

export async function notifyFacilityRegistration(formData: {
  facilityWhatsapp: string;
  facilityPhone: string;
  ownerPhone: string;
  facilityName: string;
  email: string;
  gpsAddress: string;
}) {
  const {
    facilityWhatsapp,
    facilityPhone,
    ownerPhone,
    facilityName,
    email,
    gpsAddress,
  } = formData;

  const handshakeVariables = { "1": facilityName };

  // 1. Try Facility WhatsApp
  const isFacilityOnWA_One = await checkWhatsAppAvailability(facilityWhatsapp);
  if (isFacilityOnWA_One) {
    const res = await initiateWhatsAppHandshake(
      facilityWhatsapp,
      undefined,
      handshakeVariables,
      email,
      gpsAddress,
    );
    if (res.success) return { channel: "whatsapp", recipient: "facility" };
  }

  // 2. Try Facility Phone WhatsApp
  const isFacilityOnWA_Two = await checkWhatsAppAvailability(facilityPhone);
  if (isFacilityOnWA_Two) {
    const res = await initiateWhatsAppHandshake(
      facilityPhone,
      undefined,
      handshakeVariables,
      email,
      gpsAddress,
    );
    if (res.success) return { channel: "whatsapp", recipient: "facility" };
  }

  // 3. Try Owner WhatsApp
  const isOwnerOnWA = await checkWhatsAppAvailability(ownerPhone);
  if (isOwnerOnWA) {
    const res = await initiateWhatsAppHandshake(
      ownerPhone,
      undefined,
      handshakeVariables,
      email,
      gpsAddress,
    );
    if (res.success) return { channel: "whatsapp", recipient: "owner" };
  }

  // 4. Final Fallback: Owner SMS
  const message = `Success! ${facilityName} is now registered on 4 Our Life. Please check your email for the admin portal invite.`;
  const smsRes = await sendSMS(ownerPhone, message);
  if (smsRes.success) {
    return { channel: "sms", recipient: "owner" };
  }

  throw new Error("Failed to deliver notification to all channels.");
}
