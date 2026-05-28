import React, { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  delta?: string
  deltaType?: 'up' | 'down' | 'neutral'
  variant?: string
  menuItems?: { label: string; onClick?: () => void }[]
}

export default function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaType = 'up',
  variant = 'blue',
  menuItems = []
}: KpiCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const variantClasses: Record<string, string> = {
    blue: 'bg-blue-50/70 text-blue-700',
    green: 'bg-emerald-50/70 text-emerald-700',
    purple: 'bg-purple-50/70 text-purple-700',
    teal: 'bg-teal-50/70 text-teal-700',
    amber: 'bg-amber-50/80 text-amber-700',
    indigo: 'bg-indigo-50/70 text-indigo-700',
    orange: 'bg-orange-50/80 text-orange-600',
    gold: 'bg-yellow-50/85 text-yellow-700',
    red: 'bg-red-50/70 text-red-700',
    pink: 'bg-pink-50/70 text-pink-700',
  }

  const valueTextColors: Record<string, string> = {
    blue: 'text-blue-700',
    green: 'text-emerald-700',
    purple: 'text-purple-700',
    teal: 'text-teal-700',
    amber: 'text-amber-700',
    indigo: 'text-indigo-700',
    orange: 'text-orange-600',
    gold: 'text-yellow-600',
    red: 'text-red-700',
    pink: 'text-pink-700',
  }

  const deltaClasses: Record<string, string> = {
    up: 'bg-emerald-100/80 text-emerald-800',
    down: 'bg-red-100/80 text-red-800',
    neutral: 'bg-slate-100/80 text-slate-600'
  }

  return (
    <div className="bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] rounded-[20px] p-5 transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-default flex justify-between items-start">
      {/* Left side: Value, Label, and Delta Badge */}
      <div className="flex flex-col items-start justify-between min-h-[92px]">
        <div className="flex flex-col items-start">
          <div className={cn("text-2xl font-black tracking-tight leading-none", valueTextColors[variant] || valueTextColors.blue)}>
            {value}
          </div>
          <div className="text-sm font-bold text-slate-500 mt-1">
            {label}
          </div>
        </div>

        {delta && (
          <div className={cn(
            "inline-flex items-center gap-1 text-[11px] font-bold mt-4 px-3 py-1 rounded-full",
            deltaClasses[deltaType] || deltaClasses.neutral
          )}>
            {deltaType === 'up' && <span className="font-extrabold">↑</span>}
            {deltaType === 'down' && <span className="font-extrabold">↓</span>}
            <span className="ml-0.5">{delta}</span>
          </div>
        )}
      </div>

      {/* Right side: Icon Container & Menu (if present) */}
      <div className="flex flex-col items-end gap-2 relative">
        {menuItems.length > 0 && (
          <div className="absolute -top-3 -right-2 z-10">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {menuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[140px] z-20 py-1 overflow-hidden">
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.onClick?.(); setMenuOpen(false) }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />}
          </div>
        )}

        <div className={cn(
          "w-[54px] h-[54px] rounded-[16px] flex items-center justify-center text-[26px] shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]",
          variantClasses[variant] || variantClasses.blue
        )}>
          {icon}
        </div>
      </div>
    </div>
  )
}
