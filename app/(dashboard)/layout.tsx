import type { ReactNode } from "react";

import { PermissionsProvider } from "@/components/providers/PermissionsProvider";
import AdminSecurityLayer from "@/components/security/AdminSecurityLayer";
import { AiJobProviderClient } from "@/stores/ai-job-context";

import DashboardWrapper from "./_components/DashboardWrapper";

/**
 * The single layout for the (dashboard) route group.
 *
 * ── Why this file was rewritten (cleanup, Sept 2026) ────────────────────
 * This route group used to contain BOTH `layout.js` and `layout.tsx`.
 * Next.js resolves one and silently ignores the other, and nothing in
 * next.config.ts pinned `pageExtensions`, so which one won was a framework
 * default rather than a decision anyone made.
 *
 * `layout.js` won. Verified against the committed production build:
 * .next/server/app/(dashboard)/dashboard/page_client-reference-manifest.js
 * lists DashboardWrapper.tsx, stores/ai-job-context.tsx and
 * stores/permission-context.tsx — and lists no components/security/* module.
 *
 * The consequence: the Part AK security layer that the old `layout.tsx`
 * existed to mount — ForensicWatermark, SecurityCanary, IdleSessionGuard,
 * BotSignalCollector — has never run in production. It was written, merged
 * and shipped into a file the framework was ignoring.
 *
 * Both trees are merged here, and `layout.js` is deleted, so there is
 * exactly one layout for this route group.
 *
 * ── Order, and why ─────────────────────────────────────────────────────
 * PermissionsProvider is an async SERVER component: it reads the session
 * from cookies and resolves the admin's role and permissions. It has to be
 * outermost so everything below renders with that context available.
 *
 * AdminSecurityLayer sits INSIDE DashboardWrapper rather than outside it.
 * DashboardWrapper returns null until the session is confirmed, so placing
 * the security layer inside means the watermark and canary only mount once
 * there is an identity to attribute them to — a watermark over a blank
 * pre-auth screen identifies nobody. The layer renders a fragment, so it
 * still introduces no DOM ancestor between the shell and page content.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionsProvider>
      <AiJobProviderClient>
        <DashboardWrapper>
          <AdminSecurityLayer>{children}</AdminSecurityLayer>
        </DashboardWrapper>
      </AiJobProviderClient>
    </PermissionsProvider>
  );
}
