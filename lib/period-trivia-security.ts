import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function secret(name: "PERIOD_LEAD_ENCRYPTION_KEY" | "TRIVIA_DEVICE_PEPPER") {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function encryptionKey() {
  return createHmac("sha256", secret("PERIOD_LEAD_ENCRYPTION_KEY")).update("period-trivia-leads-v1").digest();
}

export function encryptLead(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value.trim(), "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptLead(value: string) {
  const [version, iv, tag, data] = value.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("INVALID_CIPHERTEXT");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export function privacyHash(value: string, purpose: "device" | "mobile") {
  return createHmac("sha256", secret("TRIVIA_DEVICE_PEPPER")).update(`${purpose}:${value.trim().toLowerCase()}`).digest("hex");
}

export function normalizeMobile(value: string) {
  return value.replace(/[^\d+]/g, "").replace(/^00/, "+");
}

export function maskMobile(value: string) {
  const normalized = normalizeMobile(value);
  return normalized.length < 5 ? "••••" : `${normalized.slice(0, 4)}••••${normalized.slice(-3)}`;
}
