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
  if (!body.Signature || !body.Type || !body.SigningCertURL) {
    console.error("[sns-verify] missing Signature/Type/SigningCertURL", {
      hasSignature: !!body.Signature,
      type: body.Type,
      certUrl: body.SigningCertURL,
    });
    return false;
  }
  if (!CERT_URL_PATTERN.test(body.SigningCertURL)) {
    console.error("[sns-verify] SigningCertURL failed pattern check", body.SigningCertURL);
    return false;
  }

  const fields = body.Type === "Notification" ? NOTIFICATION_FIELDS : SUBSCRIPTION_FIELDS;
  // AWS omits a field entirely (e.g. Subject) when it isn't set — treat null the same as absent.
  const stringToSign = fields
    .filter((field) => body[field] != null)
    .map((field) => `${field}\n${body[field]}\n`)
    .join("");

  const certResponse = await fetch(body.SigningCertURL);
  if (!certResponse.ok) {
    console.error("[sns-verify] failed to fetch signing cert", certResponse.status, body.SigningCertURL);
    return false;
  }
  const cert = await certResponse.text();

  const algorithm = body.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";
  const verifier = crypto.createVerify(algorithm);
  verifier.update(stringToSign, "utf8");
  const result = verifier.verify(cert, body.Signature, "base64");

  if (!result) {
    console.error("[sns-verify] signature check failed", {
      type: body.Type,
      algorithm,
      signatureVersion: body.SignatureVersion,
      stringToSign,
    });
  }

  return result;
}
