"use client"

import React, { useState } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className="flex-1 min-w-0 transition-all duration-300 ease-out overflow-x-hidden"
        style={{ paddingLeft: sidebarCollapsed ? 58 : 218 }}
      >
        <div className="w-full min-w-0 p-5 max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
