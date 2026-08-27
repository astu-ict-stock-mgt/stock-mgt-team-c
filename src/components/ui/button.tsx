import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Base: shared easing, a real press, and no competing focus ring.
//
// Three deliberate changes from the stock shadcn base:
//  · `active:` — the button now acknowledges the click. A control that
//    depresses feels connected to the pointer; one that only changes colour
//    on hover feels like a picture of a button.
//  · `transition-[...]` over `transition-all` — animating *all* properties
//    means layout-affecting ones get animated too, which is where sluggish
//    and janky come from.
//  · no `focus-visible:ring` — focus is one crisp outline defined once in
//    globals.css, so every control in the app matches.
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium shrink-0 outline-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 disabled:active:translate-y-0 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-strong",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-border-strong dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        // A text link is not a surface, so it should not depress like one.
        link: "text-link hover:text-link-hover active:translate-y-0 active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
