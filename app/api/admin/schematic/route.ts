import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { adminAuthErrorResponse, requireAdminApiUser } from "@/lib/admin-api-auth";
import { PERMISSION_CATALOG, ROLE_DEFAULTS } from "@/lib/permissions";
import { getPlatformHealth } from "@/lib/service-health";

/**
 * Platform Schematic data (Gap Analysis Part Y). Super_admin-only via
 * schematic.view. Everything here is DERIVED at request time (Y-D3: derive,
 * never hard-code): package.json versions, the RBAC catalog, the migrations
 * directory, and the build stamp. Nothing to maintain by hand.
 */

interface TechStackEntry {
  name: string;
  version: string;
}

const STACK_DEPS = [
  "next",
  "react",
  "@supabase/supabase-js",
  "@supabase/ssr",
  "@tanstack/react-query",
  "@tanstack/react-table",
  "tailwindcss",
  "zod",
  "recharts",
  "twilio",
  "resend",
  "openai",
];

function readTechStack(): { app: string; node?: string; deps: TechStackEntry[] } {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    version?: string;
    engines?: { node?: string };
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const deps: TechStackEntry[] = STACK_DEPS.filter((name) => all[name]).map(
    (name) => ({ name, version: all[name].replace(/^[\^~]/, "") }),
  );
  return { app: pkg.version ?? "unknown", node: pkg.engines?.node, deps };
}

function readMigrations(): { count: number; latest: string | null } {
  const dir = path.join(process.cwd(), "supabase", "migrations");
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    return { count: files.length, latest: files.at(-1) ?? null };
  } catch {
    return { count: 0, latest: null };
  }
}

export async function GET() {
  const auth = await requireAdminApiUser("schematic.view");
  if (!auth.ok) return adminAuthErrorResponse(auth);

  try {
    const [health, stack, migrations] = await Promise.all([
      getPlatformHealth(),
      Promise.resolve(readTechStack()),
      Promise.resolve(readMigrations()),
    ]);

    const rbac = {
      permissionCount: PERMISSION_CATALOG.length,
      roleCount: Object.keys(ROLE_DEFAULTS).length + 1, // + super_admin bypass role
      roles: ["super_admin", ...Object.keys(ROLE_DEFAULTS)],
    };

    const build = {
      commit: process.env.VERCEL_GIT_COMMIT_SHA
        ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
        : null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ health, stack, migrations, rbac, build });
  } catch (err) {
    console.error("[schematic] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to build schematic payload" },
      { status: 500 },
    );
  }
}
