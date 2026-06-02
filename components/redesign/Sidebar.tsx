"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  ChevronRight, 
  ChevronLeft
} from 'lucide-react'
import { dashboardNavSections } from '@/app/(dashboard)/_components/admin-shell/navigation'
import { cn } from '@/lib/utils'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
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
  }, [])

  // Helper to check if a link is active including query params
  const isLinkActive = (href: string) => {
    if (!href) return false;
    const [path, query] = href.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    
    // Check if all params in href exist in current URL
    const params = new URLSearchParams(query);
    let allMatch = true;
    params.forEach((value, key) => {
      if (searchParams.get(key) !== value) allMatch = false;
    });
    return allMatch;
  };

  useEffect(() => {
    const initialGroups: Record<number, boolean> = {}
    dashboardNavSections.forEach((_, i) => { initialGroups[i] = true })
    setExpandedGroups(initialGroups)
  }, [])

  const toggleGroup = (idx: number) => {
    setExpandedGroups(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const toggleItem = (title: string) => {
    setExpandedItems(prev => ({ ...prev, [title]: !prev[title] }))
  }

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen sidebar-emerald z-40 flex flex-col transition-all duration-300 ease-out overflow-y-auto overflow-x-hidden",
        collapsed ? "w-[58px]" : "w-[218px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-white/10 min-h-[60px]">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          <img src="/assets/images/all-img/logo.png" alt="4 Our Life" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="font-extrabold text-sm tracking-tight whitespace-nowrap">
            4 Our Life
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2">
        {dashboardNavSections.map((section, sIdx) => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(sIdx)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-bold text-emerald-200/60 uppercase tracking-wider cursor-pointer"
              >
                <span>{section.title}</span>
                <ChevronRight
                  className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    expandedGroups[sIdx] ? 'rotate-90' : ''
                  )}
                />
              </button>
            )}
            
            {(collapsed || expandedGroups[sIdx]) && (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0
                  const isActive = isLinkActive(item.href) || (hasChildren && item.children?.some(c => isLinkActive(c.href)))
                  const isItemExpanded = expandedItems[item.title] || (hasChildren && item.children?.some(c => isLinkActive(c.href)))

                  if (item.title === "Logout") {
                    return (
                      <button
                        key={item.title}
                        onClick={handleLogout}
                        className={cn(
                          "flex items-center w-full gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer sidebar-item-hover",
                          collapsed ? 'justify-center' : ''
                        )}
                      >
                        <span className="text-[16px] flex-shrink-0">{item.icon}</span>
                        {!collapsed && <span className="truncate">Logout</span>}
                      </button>
                    )
                  }

                  return (
                    <div key={item.title}>
                      {hasChildren && !collapsed ? (
                        <div>
                          <button
                            onClick={() => toggleItem(item.title)}
                            className={cn(
                              "flex items-center w-full gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                              isActive 
                                ? "sidebar-item-active" 
                                : "sidebar-item-hover"
                            )}
                          >
                            <span className="text-[16px] flex-shrink-0">{item.icon}</span>
                            <span className="truncate">{item.title}</span>
                            <ChevronRight className={cn(
                              "ml-auto w-3 h-3 transition-transform",
                              isItemExpanded ? "rotate-90" : ""
                            )} />
                          </button>
                          
                          {isItemExpanded && (
                            <div className="mt-0.5 ml-4 border-l border-white/10 space-y-0.5">
                              {item.children?.map((child) => (
                                <Link
                                  key={child.title}
                                  href={child.href}
                                  className={cn(
                                    "block px-4 py-1.5 text-[11px] rounded-lg transition-all duration-150 hover:bg-white/5",
                                    isLinkActive(child.href)
                                      ? "text-white font-bold bg-white/10"
                                      : "text-emerald-100/70 hover:text-white"
                                  )}
                                >
                                  {child.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer",
                            isActive
                              ? 'sidebar-item-active'
                              : 'sidebar-item-hover',
                            collapsed ? 'justify-center' : ''
                          )}
                        >
                          <span className="text-[16px] flex-shrink-0">{item.icon}</span>
                          {!collapsed && (
                            <>
                              <span className="truncate">{item.title}</span>
                              {item.badge && (
                                <span className="ml-auto bg-ek-red text-white text-[9px] font-extrabold px-1.5 py-0 rounded-full min-w-[16px] text-center shadow-sm">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-[72px] w-6 h-6 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-ek-emerald-active transition-colors cursor-pointer z-50"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Footer */}
      <div className="px-3.5 py-3 border-t border-white/10">
        <div className={cn("flex items-center gap-2", collapsed ? 'justify-center' : '')}>
          <div className="w-7 h-7 rounded-full bg-ek-emerald-active flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 border border-white/20">
            {profile?.name
              ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              : '—'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div className="text-xs font-semibold truncate text-white">{profile?.name || 'Loading...'}</div>
              <div className="text-[10px] text-emerald-200/60 truncate uppercase tracking-wide">{profile?.role || 'Admin'}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
