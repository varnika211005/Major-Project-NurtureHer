import { cn } from "@/lib/utils";

export function BrandEmblem({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-testid={compact ? "brand-icon" : "brand-emblem"}
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden",
        compact && "rounded-2xl ring-1 ring-lavender-200/70 dark:ring-white/15",
        className,
      )}
    >
      <img
        src={compact ? "/nurtureher-icon.png" : "/nurtureher-logo.png"}
        alt=""
        draggable={false}
        className={cn(
          "max-w-none select-none",
          compact ? "h-full w-full object-cover" : "h-[130%] w-auto",
        )}
      />
    </span>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="brand-wordmark"
      className={cn(
        "shrink-0 font-display text-[1.35rem] font-bold leading-none tracking-[-0.035em] text-ink dark:text-white",
        className,
      )}
    >
      Nurture<span className="text-primary dark:text-primary">Her</span>
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandEmblem />
      <BrandWordmark />
    </span>
  );
}
