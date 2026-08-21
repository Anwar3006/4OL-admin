"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Dark-mode wiring (Gap Analysis Part Q). next-themes was installed but
 * never connected; the root layout is now a server component and mounts
 * this provider with class strategy (tailwind.config: darkMode "class").
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
