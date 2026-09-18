import { NextRequest, NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";

const REMINDER_SELECT = `
  id,
  user_id,
  drug_id,
  drug_name,
  dosage_amount,
  interval,
  interval_unit,
  drug_type,
  drug_color,
  notification_schedule,
  number_of_intakes,
  purpose,
  instructions,
  is_enabled,
  is_active,
  start_date,
  end_date,
  last_sent_at,
  created_at,
  user_profiles!medication_reminders_user_id_fkey(
    user_id,
    public_id,
    first_name,
    last_name,
    region
  ),
  drugs!medication_reminders_drug_id_fkey(
    name,
    generic_name,
    manufacturer,
    strength,
    strength_unit,
    dosage_form,
    conditions_treated
  )
`;

/** Full admin reminder list, including catalog and adherence data. */
export async function GET(request: NextRequest) {
  const auth = await requireAdminApiUser("medication.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 10),
  );
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const from = (page - 1) * limit;
  const admin = getAdminClient();

  let query = admin
    .from("medication_reminders")
    .select(REMINDER_SELECT, { count: "exact" });
  if (search) query = query.ilike("drug_name", `%${search}%`);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as any[];
  const reminderIds = rows.map((row) => row.id);
  const adherenceByReminder = new Map<
    string,
    { total: number; taken: number; skipped: number; missed: number }
  >();

  if (reminderIds.length > 0) {
    const adherenceResult = await admin
      .from("medication_adherence")
      .select("reminder_id, status")
      .in("reminder_id", reminderIds);

    if (adherenceResult.error) {
      return NextResponse.json(
        { error: adherenceResult.error.message },
        { status: 500 },
      );
    }

    for (const log of adherenceResult.data ?? []) {
      const current = adherenceByReminder.get(log.reminder_id) ?? {
        total: 0,
        taken: 0,
        skipped: 0,
        missed: 0,
      };
      current.total += 1;
      if (log.status === "taken") current.taken += 1;
      if (log.status === "skipped") current.skipped += 1;
      if (log.status === "missed") current.missed += 1;
      adherenceByReminder.set(log.reminder_id, current);
    }
  }

  const reminders = rows.map((row) => {
    const adherence = adherenceByReminder.get(row.id) ?? {
      total: 0,
      taken: 0,
      skipped: 0,
      missed: 0,
    };
    const profile = row.user_profiles;
    const drug = row.drugs;
    const reminderPurpose = Array.isArray(row.purpose)
      ? row.purpose.filter((item: unknown): item is string => typeof item === "string")
      : [];

    return {
      ...row,
      generic_name: drug?.generic_name ?? null,
      manufacturer: drug?.manufacturer ?? null,
      strength: drug?.strength ?? null,
      strength_unit: drug?.strength_unit ?? null,
      dosage_form: drug?.dosage_form ?? null,
      conditions_treated:
        reminderPurpose.length > 0
          ? reminderPurpose
          : drug?.conditions_treated ?? [],
      adherence_rate:
        adherence.total > 0
          ? Math.round((adherence.taken / adherence.total) * 100)
          : null,
      adherence_total: adherence.total,
      missed_count: adherence.missed,
      skipped_count: adherence.skipped,
      user_profiles: {
        user_id: profile?.user_id ?? row.user_id,
        public_id: profile?.public_id ?? null,
        name:
          [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
          "Unknown User",
        region: profile?.region ?? null,
      },
    };
  });

  return NextResponse.json({ reminders, count: count ?? 0 });
}
