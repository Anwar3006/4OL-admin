/**
 * PHI masking helpers (Gap Analysis Part C, C.5 + mockup PHI banner).
 *
 * Policy: full phone/email/NHIS identifiers are shown unmasked only to
 * super_admin; every other role sees masked values. Server routes apply
 * these before responding; the UI can reuse them for locally-held rows.
 */

/** +233 24 123 4567 → +233 24 *** ***7 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone === "deleted") return phone ?? "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} *** ***${digits.slice(-1)}`;
}

/** kwame@gmail.com → kwa****@gmail.com */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const keep = Math.min(3, local.length);
  return `${local.slice(0, keep)}****${email.slice(at)}`;
}

/** Kwame Mensah → K*** M*** */
export function maskName(name: string | null | undefined): string {
  if (!name) return "—";
  return name
    .split(/\s+/)
    .map((part) => (part.length > 1 ? `${part[0]}***` : part))
    .join(" ");
}

/** NHIS number → last 3 digits only. */
export function maskNhis(nhis: string | null | undefined): string {
  if (!nhis) return "—";
  const digits = nhis.replace(/\D/g, "");
  return digits.length > 3 ? `••••${digits.slice(-3)}` : "••••";
}

/**
 * Serialize a user row for admin list/detail responses. Pass
 * isSuperAdmin=true only when the caller's role is super_admin —
 * the server decides, never the client.
 */
export function applyUserMasking<
  T extends {
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    phone_number?: string | null;
    nhis_number?: string | null;
  },
>(row: T, isSuperAdmin: boolean): T {
  if (isSuperAdmin) return row;
  const name =
    row.full_name ??
    [row.first_name, row.last_name].filter(Boolean).join(" ") ??
    null;
  return {
    ...row,
    ...(row.full_name !== undefined || row.first_name !== undefined
      ? { full_name: maskName(name) }
      : {}),
    ...(row.email !== undefined ? { email: maskEmail(row.email) } : {}),
    ...(row.phone !== undefined ? { phone: maskPhone(row.phone) } : {}),
    ...(row.phone_number !== undefined
      ? { phone_number: maskPhone(row.phone_number) }
      : {}),
    ...(row.nhis_number !== undefined
      ? { nhis_number: row.nhis_number ? maskNhis(row.nhis_number) : null }
      : {}),
  };
}
