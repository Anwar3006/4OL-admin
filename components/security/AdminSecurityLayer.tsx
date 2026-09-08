"use client";

import type { ReactNode } from "react";
import SecurityCanary from "@/components/security/SecurityCanary";
import IdleSessionGuard from "@/components/security/IdleSessionGuard";
import BotSignalCollector from "@/components/security/BotSignalCollector";

/**
 * Part AK — composed security overlay for every (dashboard) page.
 *
 * Mounted once from app/(dashboard)/layout.tsx. Renders children untouched
 * (no wrapper element → no new stacking context, so the template's fixed
 * sidebars/modals keep their positioning) and adds three orthogonal layers:
 *
 *   SecurityCanary      AK-D7  attribution — invisible token scraped with
 *                                the content, resolvable to its owner
 *   IdleSessionGuard    AK-D9  enforcement — 30-min idle sign-out
 *   BotSignalCollector  AK-D8  detection — headless fingerprints + copy
 *                                telemetry
 *
 * (AK-D6, the forensic watermark overlay, was removed at product's request.)
 *
 * All three are fail-open: none of them can break a page if its backend
 * table is missing or a request fails.
 */
export default function AdminSecurityLayer({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SecurityCanary />
      <IdleSessionGuard />
      <BotSignalCollector />
    </>
  );
}
