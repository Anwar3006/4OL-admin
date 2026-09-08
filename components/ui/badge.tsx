import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-2xs font-black uppercase tracking-[0.1em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white shadow-sm",
        secondary:
          "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
        // The mechanical dark: sweep on this branch paired each variant's
        // text with a lightened tone but left bg-X-50 as-is, since a plain
        // literal-background mapping wasn't taught that hue. Left alone, that
        // is its own new failure: emerald-400 text on emerald-50 measures
        // 1.82:1 (fails badly) — bright text on a background that is ALSO
        // still pale. Every hue below instead gets a low-alpha wash of the
        // same hue over the dark surface as its background (measures 7.6:1+
        // against --color-card), matching the .badge-* legacy CSS classes in
        // globals.css and the shadcn <Badge> alerts, so all three badge
        // systems in this app read the same way in dark mode.
        destructive:
          "border-red-100 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400",
        outline:
          "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300",
        emerald:
          "border-emerald-100 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
        amber:
          "border-amber-100 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400",
        blue:
          "border-blue-100 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400",
        indigo:
          "border-indigo-100 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
        purple:
          "border-purple-100 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
