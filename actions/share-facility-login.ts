"use server";

import { sendWhatsApp, sendSMS, checkWhatsAppAvailability } from "@/lib/twilio";

export async function notifyFacilityRegistration(formData: {
  facilityWhatsapp: string;
  facilityPhone: string;
  ownerPhone: string;
  facilityName: string;
}) {
  const { facilityWhatsapp, facilityPhone, ownerPhone, facilityName } =
    formData;
  const message = `Success! ${facilityName} is now registered on 4 Our Life. Please check your email for the admin portal invite.`;

  // 1. Try Facility WhatsApp
  const isFacilityOnWA_One = await checkWhatsAppAvailability(facilityWhatsapp);
  if (isFacilityOnWA_One) {
    const res = await sendWhatsApp(facilityWhatsapp, message);
    if (res.success) return { channel: "whatsapp", recipient: "facility" };
  }

  //2.
  const isFacilityOnWA_Two = await checkWhatsAppAvailability(facilityPhone);
  if (isFacilityOnWA_Two) {
    const res = await sendWhatsApp(facilityPhone, message);
    if (res.success) return { channel: "whatsapp", recipient: "facility" };
  }

  // 2. Try Owner WhatsApp
  const isOwnerOnWA = await checkWhatsAppAvailability(ownerPhone);
  if (isOwnerOnWA) {
    const res = await sendWhatsApp(ownerPhone, message);
    if (res.success) return { channel: "whatsapp", recipient: "owner" };
  }

  // 3. Final Fallback: Owner SMS
  const smsRes = await sendSMS(ownerPhone, message);
  if (smsRes.success) {
    return { channel: "sms", recipient: "owner" };
  }

  throw new Error("Failed to deliver notification to all channels.");
}
