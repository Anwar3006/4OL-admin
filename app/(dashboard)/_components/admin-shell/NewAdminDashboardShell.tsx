"use client";

import React, { ReactNode, useState } from "react";
import Sidebar from "@/components/redesign/Sidebar";
import Topbar from "@/components/redesign/Topbar";
import { cn } from "@/lib/utils";

interface NewAdminDashboardShellProps {
  children: ReactNode;
}

export default function NewAdminDashboardShell({
  children,
}: NewAdminDashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    /*
     * Root: full viewport, no overflow-hidden here so modals / dropdowns
     * can escape. The inner `main` handles its own scroll.
     */
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ease-out",
          // Mobile: slide in/out
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: always visible
          "lg:translate-x-0",
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* ── Main content column ── */}
      <main
        className={cn(
          "flex flex-col flex-1 min-h-screen transition-all duration-300 ease-out",
          // Push content right on desktop to clear the sidebar
          sidebarCollapsed ? "lg:pl-[58px]" : "lg:pl-[218px]",
          // No left-push on mobile (sidebar overlays instead)
          "pl-0",
        )}
      >
        {/* Sticky topbar */}
        <Topbar
          breadcrumb="Dashboard"
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />

        {/* Page content — fluid padding via CSS var */}
        <div
          className="flex-1 w-full mx-auto"
          style={{
            maxWidth: "1600px",
            padding: "var(--page-py) var(--page-px)",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
