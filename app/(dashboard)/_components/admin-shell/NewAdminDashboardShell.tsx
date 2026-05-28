"use client"

import React, { ReactNode, useState } from 'react'
import Sidebar from '@/components/redesign/Sidebar'
import Topbar from '@/components/redesign/Topbar'
import { cn } from '@/lib/utils'

interface NewAdminDashboardShellProps {
  children: ReactNode
}

export default function NewAdminDashboardShell({ children }: NewAdminDashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}

      <div className={cn(
        "transition-transform duration-300 ease-out z-50 lg:translate-x-0 lg:static fixed h-screen",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      <main
        className={cn(
          "flex-1 transition-all duration-300 ease-out flex flex-col w-full h-screen overflow-y-auto",
          sidebarCollapsed ? "lg:ml-[58px]" : "lg:ml-[218px]",
          "ml-0"
        )}
      >
        <Topbar 
          breadcrumb="Dashboard" 
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  )
}
