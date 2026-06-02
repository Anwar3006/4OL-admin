"use client";

import React, { useRef, useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  /** Colour variant — controls icon background + value colour */
  variant?: "blue" | "green" | "purple" | "teal" | "amber" | "indigo" | "orange" | "gold" | "red" | "pink";
  menuItems?: { label: string; onClick?: () => void }[];
}

const ICON_BG: Record<string, string> = {
  blue:   "bg-blue-50   text-blue-600",
  green:  "bg-emerald-50 text-emerald-600",
  purple: "bg-purple-50  text-purple-600",
  teal:   "bg-teal-50    text-teal-600",
  amber:  "bg-amber-50   text-amber-600",
  indigo: "bg-indigo-50  text-indigo-600",
  orange: "bg-orange-50  text-orange-500",
  gold:   "bg-yellow-50  text-yellow-600",
  red:    "bg-red-50     text-red-600",
  pink:   "bg-pink-50    text-pink-600",
};

const VALUE_CLR: Record<string, string> = {
  blue:   "text-blue-700",
  green:  "text-emerald-700",
  purple: "text-purple-700",
  teal:   "text-teal-700",
  amber:  "text-amber-700",
  indigo: "text-indigo-700",
  orange: "text-orange-600",
  gold:   "text-yellow-700",
  red:    "text-red-700",
  pink:   "text-pink-700",
};

const DELTA_CLR: Record<string, string> = {
  up:      "bg-emerald-100 text-emerald-800",
  down:    "bg-red-100     text-red-800",
  neutral: "bg-slate-100   text-slate-600",
};

export default function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaType = "neutral",
  variant = "blue",
  menuItems = [],
}: KpiCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div className="kpi-card flex-col gap-4 p-5 sm:p-6 h-full">
      {/* ── Top Row: Label + Icon/Menu ── */}
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 truncate">
            {label}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={cn(
              "flex items-center justify-center rounded-xl shrink-0 w-9 h-9",
              ICON_BG[variant] ?? ICON_BG.blue,
            )}
            style={{ fontSize: "18px" }}
          >
            {icon}
          </div>

          {menuItems.length > 0 && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400
                           hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer border-0 bg-transparent"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div
                  className="absolute top-full right-0 mt-2 bg-white border border-slate-200
                              rounded-xl z-20 py-1.5 overflow-hidden shadow-xl"
                  style={{ minWidth: 160 }}
                >
                  {menuItems.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { item.onClick?.(); setMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-600
                                 hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Middle: Value ── */}
      <div className="flex flex-col gap-1.5">
        <div className={cn("text-2xl sm:text-3xl font-black tracking-tighter leading-tight", VALUE_CLR[variant])}>
          {value}
        </div>

        {/* ── Bottom: Delta Badge ── */}
        {delta && (
          <div className="flex items-center">
            <div
              className={cn(
                "inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-lg",
                DELTA_CLR[deltaType] ?? DELTA_CLR.neutral,
              )}
              style={{ fontSize: "10px" }}
            >
              {deltaType === "up"   && <span className="text-[12px]">↑</span>}
              {deltaType === "down" && <span className="text-[12px]">↓</span>}
              {delta}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
