import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Text input.
 *
 * Hairline-first: the stock `shadow-xs` is dropped, because in this system
 * borders carry structure and shadows are reserved for things that float.
 * The border warms on hover so a field reads as interactive before it is
 * focused, and focus itself is the single app-wide outline from globals.css
 * rather than a second, blurrier ring competing with it.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "transition-[border-color,background-color] duration-[140ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:border-border-strong focus-visible:border-ring",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
