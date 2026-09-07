"use client";

import React from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  errorLabel?: string;
  emptyLabel?: string;
  /** Colour variant — controls icon background + value colour */
  variant?:
    | "blue"
    | "green"
    | "purple"
    | "teal"
    | "amber"
    | "indigo"
    | "orange"
    | "gold"
    | "red"
    | "pink";
  menuItems?: { label: string; onClick?: () => void }[];
  /** Optional deep link — makes the whole card clickable (dashboard hub). */
  href?: string;
}

const ICON_BG: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  purple: "bg-purple-50 text-purple-600",
  teal: "bg-teal-50 text-teal-600",
  amber: "bg-amber-50 text-amber-600",
  indigo: "bg-indigo-50 text-indigo-600",
  orange: "bg-orange-50 text-orange-500",
  gold: "bg-yellow-50 text-yellow-600",
  red: "bg-red-50 text-red-600",
  pink: "bg-pink-50 text-pink-600",
};

const VALUE_CLR: Record<string, string> = {
  blue: "text-blue-700",
  green: "text-emerald-700",
  purple: "text-purple-700",
  teal: "text-teal-700",
  amber: "text-amber-700",
  indigo: "text-indigo-700",
  orange: "text-orange-600",
  gold: "text-yellow-700",
  red: "text-red-700",
  pink: "text-pink-700",
};

export default function KpiCard({
  icon,
  label,
  value,
  delta,
  deltaType = "neutral",
  isLoading = false,
  isError = false,
  isEmpty = false,
  errorLabel = "Unavailable",
  emptyLabel = "No data",
  variant = "blue",
  menuItems = [],
  href,
}: KpiCardProps) {
  const displayValue = isError ? errorLabel : isEmpty ? emptyLabel : value;

  const card = (
    <Card
      className={cn(
        "flex-col gap-4 p-5 sm:p-6 h-full w-full min-w-0 hover:shadow-md transition-shadow",
        isError && "border-red-100 bg-red-50/30",
        href && "cursor-pointer hover:border-emerald-200",
      )}
    >
      <CardContent className="p-0 flex flex-col gap-4 h-full">
        {/* ── Top Row: Label + Icon/Menu ── */}
        <div className="flex items-start justify-between w-full gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            {/* Part S/S-D3: sentence-case 12px medium label — the old 10px
                black uppercase micro-labels broke Part Q's legibility floor. */}
            <div className="text-xs font-medium text-slate-500 truncate">
              {label}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div
              className={cn(
                "flex items-center justify-center rounded-xl shrink-0 size-9",
                ICON_BG[variant] ?? ICON_BG.blue,
              )}
              style={{ fontSize: "18px" }}
            >
              {icon}
            </div>

            {menuItems.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer border-0 bg-transparent"
                    // Prevent navigation when the card itself is a link.
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuItems.map((item, i) => (
                    <DropdownMenuItem key={i} onClick={() => item.onClick?.()}>
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* ── Middle: Value ── */}
        <div className="flex flex-col gap-1.5">
          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-slate-100" />
          ) : (
            <div
              className={cn(
                // Part S/S-D5: fixed 22px semibold (no responsive jump),
                // tabular figures + break-words so values never escape the
                // card boundary (S-D4).
                "text-2xl font-semibold leading-tight tracking-tight tabular-nums break-words",
                isError
                  ? "text-red-700"
                  : isEmpty
                    ? "text-slate-400"
                    : VALUE_CLR[variant],
              )}
            >
              {displayValue}
            </div>
          )}

          {/* ── Bottom: Delta Badge ── */}
          {!isLoading && !isError && delta && (
            <div className="flex items-center">
              <Badge
                variant={
                  deltaType === "up"
                    ? "emerald"
                    : deltaType === "down"
                      ? "destructive"
                      : "secondary"
                }
                className="font-medium"
              >
                {deltaType === "up" && <span className="text-sm">↑</span>}
                {deltaType === "down" && <span className="text-sm">↓</span>}
                {delta}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {card}
      </Link>
    );
  }
  return card;
}
