import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getAdminClient } from "@/lib/db/admin";
const SupportRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  category: z.enum(["Billing", "Technical", "Health Consultation", "Account", "BedTracker", "Other"]),
});

function requestRateLimitKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || req.headers.get("x-real-ip") || "unknown";
  const hash = createHash("sha256").update(`support:${ip}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const parsed = SupportRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete every field with valid details." }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin.rpc("create_public_support_ticket", {
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
    p_category: parsed.data.category,
    p_rate_limit_key: requestRateLimitKey(req),
  });

  if (error) {
    console.error("[support] ticket creation failed:", error.message);
    if (error.message.includes("support_rate_limited")) {
      return NextResponse.json({ error: "Too many requests. Please try again in an hour." }, { status: 429 });
    }
    return NextResponse.json({ error: "We could not submit your request. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ticket: data?.[0] }, { status: 201 });
}
