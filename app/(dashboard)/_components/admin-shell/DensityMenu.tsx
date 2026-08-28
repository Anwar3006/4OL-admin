"use client";

/**
 * Top-nav compact/density control.
 *
 * useDensity() already wrote data-density on <html> and globals.css already
 * consumed it — but the old trigger was a bare cycling icon button with no
 * visible state, so "am I in compact?" was unanswerable without counting
 * clicks. Same reasoning as ThemeMenu: three states need a menu, not a
 * cycle. The resolved mode is shown next to Auto so the admin can see what
 * Auto currently means on this viewport.
 */

import { Check, Monitor, Rows3, StretchHorizontal } from "lucide-react";
import NavGlyph, { NAV_GLYPH } from "./NavGlyph";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDensity, type DensityMode } from "@/hooks/use-density";

const OPTIONS: { value: DensityMode; label: string; Icon: typeof Rows3 }[] = [
  { value: "auto", label: "Auto", Icon: Monitor },
  { value: "comfortable", label: "Comfortable", Icon: StretchHorizontal },
  { value: "compact", label: "Compact", Icon: Rows3 },
];

export default function DensityMenu() {
  const { mode, effective, hydrated, setMode } = useDensity();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`Display density: ${hydrated ? mode : "auto"}. Change density`}
          title={`Density: ${hydrated ? mode : "auto"}`}
        >
          <NavGlyph char={NAV_GLYPH.density} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Display density</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuItem
            key={value}
            className="cursor-pointer text-sm"
            onClick={() => setMode(value)}
          >
            <Icon className="mr-2 size-4 text-muted-foreground" />
            <span className="flex-1">
              {label}
              {value === "auto" && hydrated && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({effective})
                </span>
              )}
            </span>
            {hydrated && mode === value && (
              <Check className="size-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-[10px] leading-relaxed text-muted-foreground">
          Auto switches to compact on screens 1024px and narrower.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
