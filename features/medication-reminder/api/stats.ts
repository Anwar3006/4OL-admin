import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

type MedicationKpis = {
  total_reminders: number;
  total_delta: number | null;
  active_reminders: number;
  active_delta: number | null;
  adherence_rate: number;
  adherence_delta: number | null;
};

const validStats = (value: unknown): value is MedicationKpis => {
  const item = Array.isArray(value) ? value[0] : value;
  return Boolean(
    item &&
      typeof item === "object" &&
      "total_reminders" in item &&
      "active_reminders" in item &&
      "adherence_rate" in item,
  );
};

/** Server-side KPI access avoids calling an admin RPC through the anon client. */
export async function GET() {
  const auth = await requireAdminApiUser("medication.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const rpcResult = await admin.rpc("get_medication_kpi_stats");

  if (!rpcResult.error && validStats(rpcResult.data)) {
    const raw = (Array.isArray(rpcResult.data)
      ? rpcResult.data[0]
      : rpcResult.data) as unknown as Partial<MedicationKpis>;
    return NextResponse.json({
      total_reminders: Number(raw.total_reminders ?? 0),
      total_delta: raw.total_delta == null ? null : Number(raw.total_delta),
      active_reminders: Number(raw.active_reminders ?? 0),
      active_delta: raw.active_delta == null ? null : Number(raw.active_delta),
      adherence_rate: Number(raw.adherence_rate ?? 0),
      adherence_delta:
        raw.adherence_delta == null ? null : Number(raw.adherence_delta),
    } satisfies MedicationKpis);
  }

  // Safe fallback for projects where the legacy RPC is missing or stale.
  const [totalResult, activeResult, adherenceResult, takenResult] =
    await Promise.all([
      admin
        .from("medication_reminders")
        .select("id", { count: "exact", head: true }),
      admin
        .from("medication_reminders")
        .select("id", { count: "exact", head: true })
        .eq("is_enabled", true)
        .eq("is_active", true),
      admin
        .from("medication_adherence")
        .select("id", { count: "exact", head: true }),
      admin
        .from("medication_adherence")
        .select("id", { count: "exact", head: true })
        .eq("status", "taken"),
    ]);

  const fallbackError = [totalResult, activeResult, adherenceResult, takenResult]
    .map((result) => result.error)
    .find(Boolean);
  if (fallbackError) {
    return NextResponse.json({ error: fallbackError.message }, { status: 500 });
  }

  const adherenceTotal = adherenceResult.count ?? 0;
  const stats: MedicationKpis = {
    total_reminders: totalResult.count ?? 0,
    total_delta: null,
    active_reminders: activeResult.count ?? 0,
    active_delta: null,
    adherence_rate:
      adherenceTotal > 0
        ? Math.round(((takenResult.count ?? 0) / adherenceTotal) * 100)
        : 0,
    adherence_delta: null,
  };

  return NextResponse.json(stats);
}
