import type { LucideIcon } from "lucide-react";

/**
 * Icon contract for KPI cards (Gap Analysis Part S, S-D2): lucide only —
 * emoji icons have per-OS metric variance and misalign inside the icon tile.
 * Fixed 18px / stroke 2 keeps every tile visually identical.
 */
export default function KpiIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return <Icon size={18} strokeWidth={2} aria-hidden className={className} />;
}
