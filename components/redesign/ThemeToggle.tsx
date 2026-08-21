"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Light/Dark switch for the Topbar (Gap Analysis Part Q).
 * Defaults to the system preference; clicking cycles light → dark → system.
 * Renders nothing until mounted to avoid hydration mismatch.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
  const label =
    theme === "light" ? "Switch to dark mode" : theme === "dark" ? "Follow system theme" : "Switch to light mode";

  return (
    <button
      type="button"
      className="tb-ico flex hover:bg-slate-50 transition-colors dark:hover:bg-slate-700/50"
      title={label}
      aria-label={label}
      onClick={() => setTheme(next)}
    >
      {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}
