import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-2xl border border-lavender-200 bg-white/90 px-4 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-white/10 dark:bg-white/10 dark:text-white",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
