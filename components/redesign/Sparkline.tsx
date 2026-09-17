"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import useDarkmode from "@/hooks/useDarkMode";

/**
 * "flat" is a real, distinct state from "neutral": flat means we compared
 * this period to the last one and nothing changed (a stagnation signal,
 * amber); neutral means there's no comparison to make at all (genuinely
 * no direction, gray). Collapsing them loses exactly the distinction a
 * reader needs — "did we grow" vs "we don't know".
 */
export type SparklineTrend = "up" | "down" | "flat" | "neutral";

export interface SparklinePoint {
  /** What to show in the hover tooltip, e.g. "Week of Sep 1" or a broadcast name. */
  label: string;
  value: number;
}

// Matches components/ui/badge.tsx's "emerald"/"destructive"/"amber"/
// "secondary" text colors exactly, so the line reads as the same signal as
// the delta badge sitting right next to it — light and dark mode each get
// their own pair rather than one hex reused everywhere regardless of theme.
const STROKE: Record<SparklineTrend, { light: string; dark: string }> = {
  up: { light: "#047857", dark: "#34d399" }, // emerald-700 / emerald-400
  down: { light: "#b91c1c", dark: "#f87171" }, // red-700 / red-400
  flat: { light: "#b45309", dark: "#fbbf24" }, // amber-700 / amber-400
  neutral: { light: "#475569", dark: "#cbd5e1" }, // slate-600 / slate-300
};

// KpiCard's Card is always bg-white / dark:bg-slate-800 — Sparkline only
// ever renders inside it, so the dot ring can target that surface exactly
// instead of a generic white halo that looks wrong on the dark card.
const SURFACE = { light: "#ffffff", dark: "#1e293b" };

interface DotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

function makeTrendDot(color: string, ring: string, lastIndex: number, hoverIndex: number | null) {
  return function TrendDot({ cx, cy, index }: DotProps) {
    if (cx == null || cy == null || index == null) return <circle key={index ?? "empty"} cx={0} cy={0} r={0} fill="none" />;
    if (index === lastIndex || index === hoverIndex) {
      return (
        <circle key={index} cx={cx} cy={cy} r={index === hoverIndex ? 5 : 4} fill={color} stroke={ring} strokeWidth={1.5} />
      );
    }
    // Every other real point stays visible but recedes — confirms this is
    // discrete data, not a decorative curve, without competing for
    // attention with the current-period / hovered dot.
    return <circle key={index} cx={cx} cy={cy} r={1.75} fill={color} fillOpacity={0.45} />;
  };
}

const TOOLTIP_W = 132;
const TOOLTIP_H = 44;

/**
 * Inline at-a-glance trend chart for a KPI card — no axis (KpiCard.tsx).
 * Hovering shows the real label + value for that point (a portal to
 * document.body, since the parent Card clips overflow); a dashed
 * reference line at the series mean gives the current point something to
 * read against. `data` must be a real ordered series with real per-point
 * labels; never pass synthesised numbers or placeholder labels.
 */
export default function Sparkline({
  data,
  trend = "neutral",
  height = 36,
  className,
}: {
  data: SparklinePoint[];
  trend?: SparklineTrend;
  height?: number;
  className?: string;
}) {
  const gradientId = React.useId();
  const [isDark] = useDarkmode();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; tooltipStyle: React.CSSProperties } | null>(null);

  if (data.length < 2) return null;

  const points = data.map((point, i) => ({ i, value: point.value, label: point.label }));
  const values = data.map((point) => point.value);
  const color = isDark ? STROKE[trend].dark : STROKE[trend].light;
  const ring = isDark ? SURFACE.dark : SURFACE.light;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  // Pad the domain instead of clamping to [dataMin, dataMax] — otherwise a
  // point sitting exactly on the min/max gets its dot and stroke clipped
  // by the container edge. A flat series (min === max) still gets a
  // sensible band to sit in the middle of instead of collapsing to a
  // single pixel row.
  const range = max - min;
  const pad = range === 0 ? Math.max(Math.abs(max) * 0.2, 1) : range * 0.2;
  const domain: [number, number] = [min - pad, max + pad];

  const hoverPoint = hover ? points[hover.index] : null;

  return (
    <div ref={containerRef} className={cn("min-w-[90px] flex-1", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 6, right: 6, bottom: 2, left: 1 }}
          onMouseMove={(state) => {
            const index = Number(state?.activeTooltipIndex);
            const container = containerRef.current;
            if (!state?.isTooltipActive || !Number.isFinite(index) || !state.activeCoordinate || !container) return;
            // Reading the ref here is safe — this runs inside a recharts
            // event callback, not during render.
            const rect = container.getBoundingClientRect();
            const cursorX = rect.left + state.activeCoordinate.x;
            const cursorY = rect.top + state.activeCoordinate.y;
            const left = Math.min(Math.max(cursorX - TOOLTIP_W / 2, 8), window.innerWidth - TOOLTIP_W - 8);
            const above = cursorY - TOOLTIP_H - 10;
            const top = above < 8 ? cursorY + 14 : above;
            setHover({ index, tooltipStyle: { position: "fixed", left, top, width: TOOLTIP_W, zIndex: 1000 } });
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis hide domain={domain} />
          {/*
            Recharts only tracks hover (isTooltipActive/activeCoordinate on
            onMouseMove) when a Tooltip child is present — rendering
            nothing (content returns null, cursor off) keeps that tracking
            live while the real tooltip is fully custom, portaled below.
          */}
          <Tooltip content={() => null} cursor={false} isAnimationActive={false} />
          <ReferenceLine y={mean} stroke={color} strokeOpacity={0.35} strokeDasharray="2 3" />
          {/* Crosshair — a vertical hairline that snaps to the hovered point. */}
          {hover && <ReferenceLine x={hover.index} stroke={color} strokeOpacity={0.3} strokeDasharray="3 3" />}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={makeTrendDot(color, ring, points.length - 1, hover?.index ?? null)}
          />
        </AreaChart>
      </ResponsiveContainer>

      {hoverPoint &&
        hover &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              ...hover.tooltipStyle,
              background: isDark ? "#0f172a" : "#ffffff",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)"}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 10,
              padding: "6px 10px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              pointerEvents: "none",
              fontFamily: "inherit",
            }}
          >
            {/* Values lead, labels follow — the number is what the reader is after. */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                color: isDark ? "#f1f5f9" : "#0f172a",
                lineHeight: 1.2,
              }}
            >
              {hoverPoint.value.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: isDark ? "#94a3b8" : "#64748b",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {hoverPoint.label}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
