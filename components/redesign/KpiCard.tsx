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
    <div className="kpi-card">
      {/* ── Left: value + label + delta ── */}
      <div className="flex flex-col items-start gap-1.5 min-w-0 flex-1">
        <div
          className={cn("font-black tracking-tight leading-none", VALUE_CLR[variant])}
          style={{ fontSize: "clamp(1.1rem, 1.8vw + 0.4rem, 1.75rem)" }}
        >
          {value}
        </div>

        <div
          className="font-bold uppercase tracking-wider leading-none text-slate-400"
          style={{ fontSize: "clamp(0.5rem, 0.25vw + 0.4rem, 0.6rem)" }}
        >
          {label}
        </div>

        {delta && (
          <div
            className={cn(
              "inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full mt-0.5",
              DELTA_CLR[deltaType] ?? DELTA_CLR.neutral,
            )}
            style={{ fontSize: "clamp(0.5rem, 0.25vw + 0.4rem, 0.6rem)" }}
          >
            {deltaType === "up"   && <span>↑</span>}
            {deltaType === "down" && <span>↓</span>}
            {delta}
          </div>
        )}
      </div>

      {/* ── Right: icon + optional menu ── */}
      <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
        {menuItems.length > 0 && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400
                         hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div
                className="absolute top-full right-0 mt-1 bg-white border border-slate-200
                            rounded-xl z-20 py-1 overflow-hidden"
                style={{ minWidth: 140, boxShadow: "var(--shadow-dropdown)" }}
              >
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.onClick?.(); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-600
                               hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Icon box — uses only default Tailwind colour classes */}
        <div
          className={cn(
            "flex items-center justify-center rounded-xl shrink-0",
            ICON_BG[variant] ?? ICON_BG.blue,
          )}
          style={{
            width:    "clamp(36px, 3vw + 16px, 50px)",
            height:   "clamp(36px, 3vw + 16px, 50px)",
            fontSize: "clamp(16px, 1.5vw + 6px, 22px)",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
