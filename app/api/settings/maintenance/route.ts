import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminApiUser } from "@/lib/admin-api-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
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
  const user = await getAdminApiUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = MaintenanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid maintenance data", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
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
