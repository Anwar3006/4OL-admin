import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from "@aws-sdk/client-pinpoint-sms-voice-v2";

let client: PinpointSMSVoiceV2Client | null = null;

function getClient(): PinpointSMSVoiceV2Client {
  if (!client) {
    client = new PinpointSMSVoiceV2Client({ region: process.env.AWS_REGION });
  }
  return client;
}

/**
 * Plain transactional SMS through AWS End User Messaging. Phone OTP does not
 * use this path; it is handled by Twilio Verify in lib/sms.ts.
 */
export async function sendSMS(to: string, message: string) {
  try {
    const response = await getClient().send(
      new SendTextMessageCommand({
        DestinationPhoneNumber: to,
        OriginationIdentity: process.env.SMS_ORIGINATION_ID,
        MessageBody: message,
        MessageType: "TRANSACTIONAL",
        ConfigurationSetName: process.env.SMS_CONFIG_SET,
      }),
    );
    return { success: true, messageId: response.MessageId };
  } catch (error) {
    const err = error as { name?: string; message?: string };
    console.error("SMS Error Details:", {
      name: err.name,
      message: err.message,
    });
    return { success: false, error: err.message || "Failed to send SMS" };
  }
}
