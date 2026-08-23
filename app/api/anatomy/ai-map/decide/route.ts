import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { decideMapping } from "@/lib/anatomy/ai-pin-mapper";

/**
 * Approve/reject AI pin-mapping suggestions (Gap Analysis Part AL, AL-D8).
 * Approval is the ONLY path that writes content ↔ body-part junction rows
 * from AI output — proposals never auto-publish.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("anatomy.edit");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const body = await req.json().catch(() => null);
  const decision = body?.decision === "approved" ? "approved"
    : body?.decision === "rejected" ? "rejected"
    : null;
  const ids: string[] = Array.isArray(body?.ids)
    ? body.ids.filter((i: unknown) => typeof i === "string")
    : typeof body?.id === "string"
      ? [body.id]
      : [];

  if (!decision || ids.length === 0) {
    return NextResponse.json(
      { error: "decision (approved|rejected) and id/ids are required." },
      { status: 400 },
    );
  }

  const results = [] as { id: string; ok: boolean; error?: string }[];
  for (const id of ids.slice(0, 100)) {
    const result = await decideMapping({
      mappingId: id,
      decision,
      reviewerId: auth.user.id,
    });
    results.push({ id, ...result });
  }

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json(
    {
      decided: results.length - failed.length,
      failed: failed.length,
      errors: failed.slice(0, 5),
    },
    { status: failed.length === results.length && failed.length > 0 ? 500 : 200 },
  );
}
