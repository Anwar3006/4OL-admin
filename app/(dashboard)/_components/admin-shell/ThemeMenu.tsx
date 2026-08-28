"use client";

/**
 * Top-nav dark-mode control.
 *
 * The ThemeProvider (next-themes, attribute="class") was already mounted in
 * the root layout and tailwind.config sets darkMode:"class" — but nothing in
 * the shell ever called setTheme, so dark mode was unreachable. This exposes
 * it as an explicit three-way menu rather than a cycling button: with a
 * System option in play, a click-to-cycle control leaves the admin guessing
 * which of the three states they landed on.
 *
 * Renders a stable placeholder until mounted; `theme` is undefined on the
 * server, so painting the real icon during SSR guarantees a hydration
 * mismatch on any admin whose stored theme isn't the default.
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NavGlyph, { NAV_GLYPH } from "./NavGlyph";

const OPTIONS = [
  { value: "light", label: "Light", glyph: NAV_GLYPH.themeLight },
  { value: "dark", label: "Dark", glyph: NAV_GLYPH.themeDark },
  { value: "system", label: "System", glyph: NAV_GLYPH.themeSystem },
] as const;

export default function ThemeMenu() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label="Theme"
        disabled
      >
        <NavGlyph char={NAV_GLYPH.themeLight} />
      </Button>
    );
  }

  const activeGlyph =
    resolvedTheme === "dark" ? NAV_GLYPH.themeDark : NAV_GLYPH.themeLight;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Theme: ${theme ?? "system"}. Change theme`}
          title={`Theme: ${theme ?? "system"}`}
        >
          <NavGlyph char={activeGlyph} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label, glyph }) => (
          <DropdownMenuItem
            key={value}
            className="cursor-pointer text-sm"
            onClick={() => setTheme(value)}
          >
            <NavGlyph char={glyph} className="mr-2" size={14} />
            <span className="flex-1">{label}</span>
            {theme === value && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
