/**
 * POST /api/user/export-data — self-serve GDPR export. Same table list and
 * zip shape as the admin-triggered features/delete-account-requests/api/
 * export-request.ts, but scoped to the CALLER's own user_id and streamed
 * straight back as a download instead of landing in the private
 * `user-data-exports` bucket — there's no admin in the loop to relay a
 * signed link, so a direct response is the simplest correct thing.
 *
 * Auth is the same Bearer-token pattern the mobile API surface uses
 * (lib/mobile-auth's getRequestUser) rather than requireAdminApiUser, since
 * the caller here is an ordinary end user, not an admin. Public entry point
 * today is the web /delete-account page (lib/db/isolated-auth's
 * session-isolated client); nothing stops a future mobile release from
 * calling the same route.
 */

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getRequestUser } from "@/lib/mobile-auth";
import { getAdminClient } from "@/lib/db/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { EXPORT_TABLES } from "@/features/delete-account-requests/schema/export-tables";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();

  const rateLimit = await checkRateLimit(admin, user.id, "user_export_data", {
    windowSeconds: 3600,
    maxRequests: 3,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many export requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const zip = new JSZip();

  const { data: profile } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  zip.file("user_profiles.json", JSON.stringify(profile ?? null, null, 2));

  for (const entry of EXPORT_TABLES) {
    const query = admin.from(entry.table).select("*");
    const { data, error } = await (
      "column" in entry
        ? query.eq(entry.column, user.id)
        : query.or(`${entry.orColumns[0]}.eq.${user.id},${entry.orColumns[1]}.eq.${user.id}`)
    );

    if (error) {
      zip.file(`${entry.table}.error.txt`, error.message);
      continue;
    }

    zip.file(`${entry.table}.json`, JSON.stringify(data ?? [], null, 2));
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `4-our-life-data-export-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
