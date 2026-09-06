/**
 * /api/reports — Reports menu backend.
 *
 * RBAC: reads require reports.view; every mutation requires reports.manage.
 * super_admin bypasses the catalog (standard requireAdminApiUser behavior).
 *
 * GET views:
 *   meta                          section catalog + provider readiness
 *   definitions                   schedules (manage)
 *   recipients&definitionId=      recipient list (manage)
 *   inbox                         runs delivered to the caller, redacted
 *   runs&definitionId=            run history (manage)
 *   run&id=                       single run (membership or manage)
 *   admins                        recipient picker (manage)
 *
 * POST actions (all manage):
 *   create_definition | update_definition | delete_definition
 *   set_recipients | generate_now | process_queue | retry_run
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { computeReportWindow, REPORT_CADENCES, REPORT_SECTIONS, runIdempotencyKey } from "@/features/reports/engine/types";
import type { ReportRecipientRow, ReportRunRow, ReportSection } from "@/features/reports/engine/types";
import { narrativeProviderConfigured, narrativeModel } from "@/features/reports/engine/narrative";
import { processReportQueue, processReportRun } from "@/features/reports/engine/processor";

export const dynamic = "force-dynamic";

const DefinitionSchema = z.object({
  name: z.string().trim().min(3).max(120),
  cadence: z.enum(REPORT_CADENCES),
  sections: z.array(z.enum(REPORT_SECTIONS)).min(1).max(REPORT_SECTIONS.length),
  timezone: z.string().trim().min(1).max(64).default("Africa/Accra"),
  deliveryHour: z.number().int().min(0).max(23).default(7),
  aiNarrative: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

const RecipientSchema = z.object({
  adminId: z.string().uuid(),
  channels: z.array(z.enum(["inbox", "email"])).min(1).default(["inbox"]),
  redactedSections: z.array(z.enum(REPORT_SECTIONS)).default([]),
});

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_definition"), definition: DefinitionSchema }),
  z.object({ action: z.literal("update_definition"), definitionId: z.string().uuid(), definition: DefinitionSchema.partial() }),
  z.object({ action: z.literal("delete_definition"), definitionId: z.string().uuid() }),
  z.object({ action: z.literal("set_recipients"), definitionId: z.string().uuid(), recipients: z.array(RecipientSchema).max(50) }),
  z.object({ action: z.literal("generate_now"), definitionId: z.string().uuid() }),
  z.object({ action: z.literal("process_queue") }),
  z.object({ action: z.literal("retry_run"), runId: z.string().uuid() }),
]);

// ------------------------------------------------------------------ GET ---

export async function GET(req: NextRequest) {
  const auth = await requireAdminApiUser("reports.view");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const view = req.nextUrl.searchParams.get("view") ?? "meta";
  const admin = getAdminClient();
  const canManage = auth.role === "super_admin" ||
    Boolean(await hasManagePermission(auth.user.id));

  switch (view) {
    case "meta": {
      return NextResponse.json({
        sections: REPORT_SECTIONS,
        cadences: REPORT_CADENCES,
        aiConfigured: narrativeProviderConfigured(),
        aiModel: narrativeProviderConfigured() ? narrativeModel() : null,
        canManage,
      });
    }

    case "definitions": {
      if (!canManage) return NextResponse.json({ error: "Missing permission: reports.manage" }, { status: 403 });
      const { data, error } = await admin
        .from("report_definitions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ definitions: data });
    }

    case "recipients": {
      if (!canManage) return NextResponse.json({ error: "Missing permission: reports.manage" }, { status: 403 });
      const definitionId = req.nextUrl.searchParams.get("definitionId");
      if (!definitionId) return NextResponse.json({ error: "definitionId required" }, { status: 400 });
      const { data, error } = await admin
        .from("report_recipients")
        .select("*")
        .eq("definition_id", definitionId)
        .order("created_at");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ recipients: data });
    }

    case "admins": {
      if (!canManage) return NextResponse.json({ error: "Missing permission: reports.manage" }, { status: 403 });
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const admins = (data?.users ?? [])
        .filter((u) => {
          const role = String(u.user_metadata?.role ?? u.app_metadata?.role ?? "");
          return role.includes("admin");
        })
        .map((u) => ({ id: u.id, email: u.email ?? null, role: u.user_metadata?.role ?? u.app_metadata?.role ?? "admin" }));
      return NextResponse.json({ admins });
    }

    case "inbox": {
      // Runs for definitions the caller is subscribed to, with the
      // caller's own section redactions applied.
      const { data: subs, error: subsError } = await admin
        .from("report_recipients")
        .select("definition_id,redacted_sections")
        .eq("admin_id", auth.user.id);
      if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });

      const redactions = new Map<string, Set<string>>();
      const definitionIds: string[] = [];
      for (const sub of (subs ?? []) as Array<{ definition_id: string; redacted_sections: string[] }>) {
        definitionIds.push(sub.definition_id);
        redactions.set(sub.definition_id, new Set(sub.redacted_sections ?? []));
      }
      if (!definitionIds.length) return NextResponse.json({ runs: [], canManage });

      const { data: runs, error: runsError } = await admin
        .from("report_runs")
        .select("*")
        .in("definition_id", definitionIds)
        .in("status", ["delivered", "delivered_metrics_only", "failed"])
        .order("created_at", { ascending: false })
        .limit(60);
      if (runsError) return NextResponse.json({ error: runsError.message }, { status: 500 });

      const names = await definitionNames(definitionIds);
      const masked = (runs ?? []).map((raw) => {
        const run = raw as unknown as ReportRunRow;
        const hidden = redactions.get(run.definition_id) ?? new Set<string>();
        const metrics = { ...(run.metrics ?? {}) } as Record<string, unknown>;
        for (const section of hidden) delete metrics[section];
        return { ...run, metrics, definitionName: names.get(run.definition_id) ?? "Report" };
      });
      return NextResponse.json({ runs: masked, canManage });
    }

    case "runs": {
      if (!canManage) return NextResponse.json({ error: "Missing permission: reports.manage" }, { status: 403 });
      const definitionId = req.nextUrl.searchParams.get("definitionId");
      const query = admin.from("report_runs").select("*").order("created_at", { ascending: false }).limit(100);
      if (definitionId) query.eq("definition_id", definitionId);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ runs: data });
    }

    case "run": {
      const id = req.nextUrl.searchParams.get("id");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const { data, error } = await admin.from("report_runs").select("*").eq("id", id).maybeSingle();
      if (error || !data) return NextResponse.json({ error: error?.message ?? "Run not found" }, { status: error ? 500 : 404 });

      if (!canManage) {
        // Must be subscribed to the definition to open one of its runs.
        const { count } = await admin
          .from("report_recipients")
          .select("id", { count: "exact", head: true })
          .eq("definition_id", (data as ReportRunRow).definition_id)
          .eq("admin_id", auth.user.id);
        if (!count) return NextResponse.json({ error: "Not subscribed to this report" }, { status: 403 });
      }
      const names = await definitionNames([(data as ReportRunRow).definition_id]);
      return NextResponse.json({ run: { ...(data as object), definitionName: names.get((data as ReportRunRow).definition_id) ?? "Report" } });
    }

    default:
      return NextResponse.json({ error: "Unknown view" }, { status: 400 });
  }
}

// ----------------------------------------------------------------- POST ---

export async function POST(req: NextRequest) {
  const auth = await requireAdminApiUser("reports.manage");
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = ActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }
  const input = parsed.data;
  const admin = getAdminClient();

  switch (input.action) {
    case "create_definition": {
      const def = input.definition;
      const nextRunAt = await rpcNextRun(def.cadence, def.timezone, def.deliveryHour);
      const { data, error } = await admin
        .from("report_definitions")
        .insert({
          name: def.name,
          cadence: def.cadence,
          sections: def.sections,
          timezone: def.timezone,
          delivery_hour: def.deliveryHour,
          ai_narrative: def.aiNarrative,
          enabled: def.enabled,
          next_run_at: nextRunAt,
          created_by: auth.user.id,
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await audit(auth.user.id, "create", "report_definition", String(data.id), { cadence: def.cadence });
      return NextResponse.json({ ok: true, definition: data }, { status: 201 });
    }

    case "update_definition": {
      const def = input.definition;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (def.name !== undefined) patch.name = def.name;
      if (def.sections !== undefined) patch.sections = def.sections;
      if (def.timezone !== undefined) patch.timezone = def.timezone;
      if (def.deliveryHour !== undefined) patch.delivery_hour = def.deliveryHour;
      if (def.aiNarrative !== undefined) patch.ai_narrative = def.aiNarrative;
      if (def.enabled !== undefined) patch.enabled = def.enabled;
      if (def.cadence !== undefined) patch.cadence = def.cadence;
      if (def.cadence !== undefined || def.timezone !== undefined || def.deliveryHour !== undefined) {
        const { data: current } = await admin.from("report_definitions").select("cadence,timezone,delivery_hour").eq("id", input.definitionId).maybeSingle();
        if (current) {
          patch.next_run_at = await rpcNextRun(
            (def.cadence ?? (current as { cadence: string }).cadence) as (typeof REPORT_CADENCES)[number],
            def.timezone ?? (current as { timezone: string }).timezone,
            def.deliveryHour ?? (current as { delivery_hour: number }).delivery_hour,
          );
        }
      }
      const { error } = await admin.from("report_definitions").update(patch).eq("id", input.definitionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await audit(auth.user.id, "update", "report_definition", input.definitionId);
      return NextResponse.json({ ok: true });
    }

    case "delete_definition": {
      const { error } = await admin.from("report_definitions").delete().eq("id", input.definitionId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await audit(auth.user.id, "delete", "report_definition", input.definitionId);
      return NextResponse.json({ ok: true });
    }

    case "set_recipients": {
      const { error: delError } = await admin.from("report_recipients").delete().eq("definition_id", input.definitionId);
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 });
      if (input.recipients.length) {
        const { error } = await admin.from("report_recipients").insert(
          input.recipients.map((r) => ({
            definition_id: input.definitionId,
            admin_id: r.adminId,
            channels: r.channels,
            redacted_sections: r.redactedSections,
            created_by: auth.user.id,
          })),
        );
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
      await audit(auth.user.id, "set_recipients", "report_definition", input.definitionId, { count: input.recipients.length });
      return NextResponse.json({ ok: true });
    }

    case "generate_now": {
      const { data: definition, error: defError } = await admin
        .from("report_definitions")
        .select("*")
        .eq("id", input.definitionId)
        .maybeSingle();
      if (defError || !definition) return NextResponse.json({ error: defError?.message ?? "Definition not found" }, { status: defError ? 500 : 404 });

      const def = definition as { id: string; cadence: (typeof REPORT_CADENCES)[number]; timezone: string };
      const window = computeReportWindow(def.cadence, def.timezone);
      const key = runIdempotencyKey(def.id, window);
      const { data: runRow, error: insError } = await admin
        .from("report_runs")
        .upsert(
          { definition_id: def.id, cadence: def.cadence, period_start: window.start, period_end: window.end, idempotency_key: key, triggered_by: auth.user.id },
          { onConflict: "idempotency_key" },
        )
        .select()
        .single();
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 });

      await audit(auth.user.id, "generate_now", "report_run", String(runRow.id), { window: `${window.start}..${window.end}` });
      const status = await processReportRun(String(runRow.id));
      return NextResponse.json({ ok: true, runId: runRow.id, status });
    }

    case "process_queue": {
      const result = await processReportQueue();
      await audit(auth.user.id, "process_queue", "report_queue", undefined, result as unknown as Record<string, unknown>);
      return NextResponse.json({ ok: true, ...result });
    }

    case "retry_run": {
      const status = await processReportRun(input.runId);
      await audit(auth.user.id, "retry", "report_run", input.runId, { status });
      return NextResponse.json({ ok: true, status });
    }
  }
}

// --------------------------------------------------------------- helpers --

async function hasManagePermission(userId: string): Promise<boolean> {
  try {
    const client = getAdminClient();
    const { data } = await client.rpc("has_4ol_permission", { p_user_id: userId, p_key: "reports.manage" });
    return Boolean(data);
  } catch {
    return false;
  }
}

async function rpcNextRun(cadence: (typeof REPORT_CADENCES)[number], timezone: string, deliveryHour: number): Promise<string | null> {
  try {
    const { data, error } = await getAdminClient().rpc("next_report_run_at", {
      p_cadence: cadence,
      p_timezone: timezone,
      p_delivery_hour: deliveryHour,
    });
    if (error) throw new Error(error.message);
    return (data as string) ?? null;
  } catch {
    // Pre-migration fallback: approximate in UTC (daily cadence still sane).
    const offsets: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, yearly: 365 };
    return new Date(Date.now() + (offsets[cadence] ?? 1) * 86_400_000).toISOString();
  }
}

async function definitionNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const { data } = await getAdminClient().from("report_definitions").select("id,name").in("id", unique);
  return new Map((data ?? []).map((row) => [row.id as string, row.name as string]));
}

async function audit(actorId: string, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  try {
    await getAdminClient().from("admin_activity_logs").insert({
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata,
    });
  } catch {
    // Audit is best-effort; never block the main action on it.
  }
}
