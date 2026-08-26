import { cn } from "@/lib/utils"

/**
 * Loading placeholder.
 *
 * Was `bg-accent animate-pulse` — but `--accent` is the faint *teal wash*
 * token, so every loading state in the app came up subtly tinted, and a
 * pulsing opacity blink reads cheaper than a sweep. `.astu-skeleton`
 * (globals.css) puts a travelling sheen over a genuinely neutral base, and
 * drops the sheen under `prefers-reduced-motion`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("astu-skeleton", className)}
      {...props}
    />
  )
}

export { Skeleton }
