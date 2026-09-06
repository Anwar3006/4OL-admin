import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { getAdminClient } from "@/lib/db/admin";
import { logSettingsChange } from "@/lib/settings-audit";

const MaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(500).optional(),
  allowedRoutes: z.array(z.string().trim().max(100)).optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
});

const defaultMaintenance = {
  enabled: false,
  message: "Platform is under maintenance. Please check back later.",
  allowedRoutes: ["/api/health"],
  scheduledStart: null,
  scheduledEnd: null,
};

export async function GET() {
  const auth = await requireAdminApiUser("settings.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select(
      "maintenance_mode, maintenance_message, maintenance_allowed_routes, maintenance_scheduled_start, maintenance_scheduled_end",
    )
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    console.error("[settings/maintenance] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load maintenance settings." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    maintenance: data
      ? {
          enabled: data.maintenance_mode,
          message: data.maintenance_message || defaultMaintenance.message,
          allowedRoutes:
            data.maintenance_allowed_routes || defaultMaintenance.allowedRoutes,
          scheduledStart: data.maintenance_scheduled_start,
          scheduledEnd: data.maintenance_scheduled_end,
        }
      : defaultMaintenance,
  });
}

export async function PUT(req: NextRequest) {
  // Maintenance mode is a security-tier control: settings.security is held
  // only by super_admin in ROLE_DEFAULTS (Part P least-privilege split).
  const auth = await requireAdminApiUser("settings.security");
  if (!auth.ok) return adminAuthErrorResponse(auth);
  const user = auth.user;

  const parsed = MaintenanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid maintenance data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .upsert({
      id: "global",
      maintenance_mode: parsed.data.enabled,
      maintenance_message: parsed.data.message || defaultMaintenance.message,
      maintenance_allowed_routes:
        parsed.data.allowedRoutes || defaultMaintenance.allowedRoutes,
      maintenance_scheduled_start: parsed.data.scheduledStart,
      maintenance_scheduled_end: parsed.data.scheduledEnd,
      updated_at: new Date().toISOString(),
    })
    .select(
      "maintenance_mode, maintenance_message, maintenance_allowed_routes, maintenance_scheduled_start, maintenance_scheduled_end",
    )
    .single();

  if (error) {
    console.error("[settings/maintenance] Supabase update error:", error.message);
    return NextResponse.json(
      { error: "Failed to update maintenance settings." },
      { status: 500 },
    );
  }

  // P10: actor + history trail for every activate/lift (best-effort).
  await admin.from("maintenance_history").insert({
    enabled: parsed.data.enabled,
    message: parsed.data.message || defaultMaintenance.message,
    toggled_by: user.id,
  });

  await logSettingsChange(
    admin,
    user.id,
    "maintenance",
    "maintenance_mode",
    null,
    { enabled: parsed.data.enabled, message: parsed.data.message ?? null },
  );

  return NextResponse.json({
    maintenance: {
      enabled: data.maintenance_mode,
      message: data.maintenance_message,
      allowedRoutes: data.maintenance_allowed_routes,
      scheduledStart: data.maintenance_scheduled_start,
      scheduledEnd: data.maintenance_scheduled_end,
    },
  });
}
