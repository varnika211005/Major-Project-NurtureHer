import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <ProgressPrimitive.Root className={cn("h-3 overflow-hidden rounded-full bg-lavender-200/60 dark:bg-white/10", className)}>
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
        style={{ width: `${value}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
