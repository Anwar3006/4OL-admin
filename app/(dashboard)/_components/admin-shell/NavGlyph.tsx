"use client";

/**
 * Top-nav glyph renderer.
 *
 * The mockup's topbar (admin-panel.html L1097–1112) uses literal emoji/text
 * characters rather than an icon set, so the shell renders the same
 * characters instead of lucide components.
 *
 * Why this wrapper rather than dropping the character inline:
 *   - Emoji are text. Without an explicit emoji font stack they fall back to
 *     whatever the OS picks, and a headless/Linux browser with no colour
 *     emoji font renders tofu. The stack below pins the platform font first
 *     and only then degrades.
 *   - line-height:1 plus a fixed font-size keeps every glyph on the same
 *     optical baseline. Emoji and the monochrome box-drawing characters the
 *     mockup mixes in (☰, ▾) have very different natural metrics, so left
 *     alone they sit at visibly different heights in the same row.
 *   - aria-hidden: every caller already carries a real aria-label on the
 *     button, and a screen reader announcing "bell" after "Notifications,
 *     3 unread" is pure noise.
 *   - select-none: the glyphs are chrome, not content; letting them land in
 *     a copied selection is just litter.
 */

import { cn } from "@/lib/utils";

const EMOJI_FONT_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla","EmojiOne Color","Android Emoji",sans-serif';

export default function NavGlyph({
  char,
  className,
  size = 15,
}: {
  char: string;
  className?: string;
  /** Font size in px. The mockup's .tb-ico sets 14px; 15 reads better at the
   *  shell's slightly larger 36px hit area. */
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block select-none leading-none", className)}
      style={{ fontFamily: EMOJI_FONT_STACK, fontSize: `${size}px`, lineHeight: 1 }}
    >
      {char}
    </span>
  );
}

/** The mockup's exact topbar characters, in source order. */
export const NAV_GLYPH = {
  home: "🏠",
  search: "🔍",
  notifications: "🔔",
  messages: "💬",
  alerts: "🚨",
  density: "☰",
  caret: "▾",
  // Not in the mockup — it has no dark-mode control. These are the
  // conventional pair, and match the sun the annotated screenshot circles.
  themeLight: "☀️",
  themeDark: "🌙",
  themeSystem: "💻",
} as const;
