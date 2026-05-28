"use client"

import React, { useState } from 'react'
import { 
  Search, 
  Bell, 
  MessageSquare, 
  AlertTriangle, 
  Menu,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface TopbarProps {
  onToggleDensity?: () => void
  onToggleMobile?: () => void
  breadcrumb: string
}

export default function Topbar({ breadcrumb, onToggleMobile }: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <header className="topbar">
      {/* Breadcrumb & Mobile Menu */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleMobile}
          className="tb-ico lg:hidden flex"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="tb-bc">
          🏠 <span className="mx-1 text-slate-400">—</span> <b>{breadcrumb}</b>
        </div>
      </div>
...
      {/* Right Actions */}
      <div className="tb-r">
        <div className="tb-ico" title="Search">🔍</div>
        
        <div className="tb-ico" title="Notifications">
          🔔<span className="tb-dot">3</span>
        </div>
        
        <div className="tb-ico" title="Messages">
          💬<span className="tb-dot bg-ek-blue">5</span>
        </div>
        
        <div className="tb-ico" title="Alerts">
          🚨<span className="tb-dot bg-ek-red">2</span>
        </div>

        <button className="tb-ico hover:bg-slate-50 transition-colors" title="Toggle density">
          ☰
        </button>

        <div className="w-px h-5.5 bg-slate-200 mx-1"></div>

        {/* User Profile */}
        <div className="relative">
          <div 
            className="tb-user group"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className="tb-uav border-2 border-emerald-100 group-hover:border-emerald-200 transition-colors shadow-sm">
              FN
            </div>
            <div className="hidden sm:block">
              <div className="tb-uname text-slate-800 leading-tight">Francis N. Mensah</div>
              <div className="tb-urole text-ek-emerald-active font-extrabold uppercase">Super Admin</div>
            </div>
            <ChevronDown className={cn(
              "w-3 h-3 text-slate-400 transition-transform duration-200",
              profileOpen ? "rotate-180" : ""
            )} />
          </div>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)}></div>
              <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-dropdown min-w-[200px] z-20 py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged in as</p>
                  <p className="text-xs font-black text-slate-800">4OL-000001</p>
                </div>
                <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <span>👤</span> My Profile
                </button>
                <button className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2">
                  <span>⚙️</span> Settings
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button className="w-full text-left px-4 py-2 text-xs text-ek-red font-bold hover:bg-red-50 transition-colors flex items-center gap-2">
                  <span>🚪</span> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
