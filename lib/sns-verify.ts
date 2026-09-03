import crypto from "node:crypto";

/**
 * Verifies an AWS SNS HTTP(S) notification's signature so the SES event
 * webhook only trusts requests that actually came from SNS. See:
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */

const CERT_URL_PATTERN =
  /^https:\/\/sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com\/SimpleNotificationService-[a-zA-Z0-9]+\.pem$/;

const NOTIFICATION_FIELDS = ["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"];
const SUBSCRIPTION_FIELDS = ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];

export async function verifySnsMessage(body: Record<string, string>): Promise<boolean> {
  if (!body.Signature || !body.Type || !body.SigningCertURL) return false;
  if (!CERT_URL_PATTERN.test(body.SigningCertURL)) return false;

  const fields = body.Type === "Notification" ? NOTIFICATION_FIELDS : SUBSCRIPTION_FIELDS;
  const stringToSign = fields
    .filter((field) => body[field] !== undefined)
    .map((field) => `${field}\n${body[field]}\n`)
    .join("");

  const certResponse = await fetch(body.SigningCertURL);
  if (!certResponse.ok) return false;
  const cert = await certResponse.text();

  const algorithm = body.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
  const verifier = crypto.createVerify(algorithm);
  verifier.update(stringToSign, "utf8");
  return verifier.verify(cert, body.Signature, "base64");
}
