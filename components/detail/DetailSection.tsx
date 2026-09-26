import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A titled, icon-led grouping of {@link DetailField}s inside a detail modal.
 *
 * `cols={2}` (default) lays fields out in a responsive two-column grid; use
 * `cols={1}` for long free-text (notes, descriptions) that should span full
 * width.
 */
export function DetailSection({
  title,
  icon: Icon,
  cols = 2,
  children,
}: {
  title: string;
  icon: LucideIcon;
  cols?: 1 | 2;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      <div
        className={cn(
          "grid gap-x-6 gap-y-4",
          cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        {children}
      </div>
    </section>
  );
}
