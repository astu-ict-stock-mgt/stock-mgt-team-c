"use client";

export function FullScreenSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-surface">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-20 w-20 rounded-full border-2 border-primary/20" />
        <span className="absolute h-20 w-20 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <div className="h-14 w-14 rounded-full bg-white shadow-sm ring-1 ring-border flex items-center justify-center overflow-hidden">
          <img src="/astu-logo.svg" alt="ASTU" className="h-full w-full object-contain p-1" />
        </div>
      </div>
      {label && <p className="text-sm text-muted-foreground animate-pulse">{label}</p>}
    </div>
  );
}
