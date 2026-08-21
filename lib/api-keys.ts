import { createHash, randomBytes } from "crypto";

/**
 * Platform API key primitives (Gap Analysis Part P, enhancement 3).
 * Hash-only storage policy: the plaintext key is returned to the admin
 * exactly once at generation/rotation and can never be retrieved again.
 */

export function generatePlatformKey(): string {
  return `4ol_${randomBytes(24).toString("hex")}`;
}

export function hashPlatformKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** First/last characters for safe display, e.g. "4ol_a1b2…9f8e". */
export function keyHint(plaintext: string): string {
  return `${plaintext.slice(0, 6)}…${plaintext.slice(-4)}`;
}
