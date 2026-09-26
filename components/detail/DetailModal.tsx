"use client";

import type { ReactNode } from "react";
import { Hash } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { initials } from "./formatters";

/**
 * The standardized detail-modal shell used across the admin panel.
 *
 * Provides a consistent anatomy: avatar + title + badges + id line header, an
 * optional full-width banner (e.g. PHI-masking notice), a scrollable body that
 * holds {@link DetailSection}s, and an optional sticky footer for actions.
 * Consumers stay in control of data fetching and pass ready-made nodes.
 */
export function DetailModal({
  open,
  onClose,
  title,
  avatar,
  badges,
  idLine,
  banner,
  footer,
  maxWidth = "sm:max-w-3xl",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Custom avatar node (e.g. <img>). Omit to derive initials from a string title. */
  avatar?: ReactNode;
  badges?: ReactNode;
  /** Custom id line; pass `false` to hide. Defaults to nothing. */
  idLine?: ReactNode;
  banner?: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  children?: ReactNode;
}) {
  const avatarNode =
    avatar !== undefined
      ? avatar
      : typeof title === "string"
        ? initials(title)
        : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "max-h-[90vh] p-0 overflow-hidden flex flex-col",
          maxWidth,
        )}
      >
        <DialogHeader className="p-6 border-b bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-start gap-4">
            {avatarNode != null && (
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 text-lg font-black overflow-hidden">
                {avatarNode}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold truncate">
                {title}
              </DialogTitle>
              {badges && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {badges}
                </div>
              )}
              {idLine !== false && idLine != null && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-mono min-w-0">
                  {idLine}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        {banner}

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-7">{children}</div>
        </ScrollArea>

        {footer && (
          <div className="p-6 border-t bg-slate-50/70 dark:bg-slate-900/60 flex gap-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Convenience id line (Hash icon + truncated id) for {@link DetailModal}. */
export function DetailIdLine({ id }: { id?: string | null }) {
  if (!id) return null;
  return (
    <>
      <Hash className="h-3 w-3 shrink-0" />
      <span className="truncate">{id}</span>
    </>
  );
}
