"use client"

import React, { useState, useEffect } from 'react'
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
import ProfileModal from './modals/ProfileModal'

interface TopbarProps {
  onToggleDensity?: () => void
  onToggleMobile?: () => void
  breadcrumb: string
}

export default function Topbar({ breadcrumb, onToggleMobile }: TopbarProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
        if (data) {
          setProfile({
            ...data,
            name: `${data.first_name || ''} ${data.last_name || ''}`.trim()
          });
        }
      }
    };
    fetchProfile();
  }, []);

  return (
    <header className="topbar">
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

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

      {/* Right Actions */}
      <div className="tb-r">
        <div className="tb-ico" title="Search">🔍</div>
        <div className="tb-ico" title="Notifications">🔔<span className="tb-dot">3</span></div>
        <div className="tb-ico" title="Messages">💬<span className="tb-dot bg-ek-blue">5</span></div>
        <div className="tb-ico" title="Alerts">🚨<span className="tb-dot bg-ek-red">2</span></div>
        <button className="tb-ico hover:bg-slate-50 transition-colors" title="Toggle density">☰</button>

        <div className="w-px h-5.5 bg-slate-200 mx-1"></div>

        {/* User Profile */}
        <div 
          className="tb-user group"
          onClick={() => setProfileOpen(true)}
        >
          <div className="tb-uav border-2 border-emerald-100 group-hover:border-emerald-200 transition-colors shadow-sm">
            {profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('') : 'U'}
          </div>
          <div className="hidden sm:block">
            <div className="tb-uname text-slate-800 leading-tight">{profile?.name || "Loading..."}</div>
            <div className="tb-urole text-ek-emerald-active font-extrabold uppercase">{profile?.role || "Admin"}</div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>
    </header>
  )
}
