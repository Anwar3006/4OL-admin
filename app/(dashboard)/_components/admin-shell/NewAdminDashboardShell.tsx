"use client";

import React, { ReactNode, useState } from "react";
import Sidebar from "@/components/redesign/Sidebar";
import Topbar from "@/components/redesign/Topbar";
import { cn } from "@/lib/utils";

interface NewAdminDashboardShellProps {
  children: ReactNode;
}

export default function NewAdminDashboardShell({ children }: NewAdminDashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    /*
     * overflow-x-hidden on the root clips any horizontal overflow at the
     * outermost layout boundary. position:fixed children (sidebar, modals,
     * dropdowns) are NOT affected — fixed elements escape all overflow containers.
     */
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — fixed, out of normal flow */}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/*
       * Main content column.
       *
       * min-w-0 is the KEY fix.  In a flex container, every flex item has
       * min-width:auto by default, meaning it WON'T shrink below the intrinsic
       * width of its content.  If any descendant is wide (a table, a long word,
       * a chart), <main> expands past 100vw causing horizontal scroll.
       * Setting min-w-0 (= min-width:0) lets <main> be constrained to the
       * flex container width (100vw), so content overflow is contained.
       *
       * The sidebar is fixed so it doesn't take flex space — <main> is the
       * only flex child and fills the full 100vw. lg:pl-[218px] / lg:pl-[58px]
       * shifts the content area away from the sidebar visually.
       */}
      <main
        className={cn(
          "flex flex-col flex-1 min-h-screen min-w-0 transition-all duration-300 ease-out",
          sidebarCollapsed ? "lg:pl-[58px]" : "lg:pl-[218px]",
          "pl-0",
        )}
      >
        {/* Sticky topbar — sticks to viewport top since <main> is not a
            y-scroll container (only overflow-x is clipped at root level) */}
        <Topbar
          breadcrumb="Dashboard"
          onToggleMobile={() => setMobileOpen((o) => !o)}
        />

        {/* Page content with fluid padding */}
        <div
          className="flex-1 w-full min-w-0"
          style={{ padding: "var(--page-py) var(--page-px)" }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
