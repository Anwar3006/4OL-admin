import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white shadow-sm",
        secondary:
          "border-slate-200 bg-slate-100 text-slate-600",
        destructive:
          "border-red-100 bg-red-50 text-red-700",
        outline:
          "border-slate-200 bg-white text-slate-600",
        emerald:
          "border-emerald-100 bg-emerald-50 text-emerald-700",
        amber:
          "border-amber-100 bg-amber-50 text-amber-700",
        blue:
          "border-blue-100 bg-blue-50 text-blue-700",
        indigo:
          "border-indigo-100 bg-indigo-50 text-indigo-700",
        purple:
          "border-purple-100 bg-purple-50 text-purple-700",
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
