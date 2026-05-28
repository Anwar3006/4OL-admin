"use client"

import React, { useState } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className="flex-1 transition-all duration-300 ease-out"
        style={{ marginLeft: sidebarCollapsed ? 58 : 218 }}
      >
        <div className="p-5 max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
