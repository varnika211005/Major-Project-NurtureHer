import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "secondary";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border border-lavender-200/80 bg-lavender-100/90 text-primary shadow-xs",
    outline: "border border-lavender-300 bg-transparent text-primary",
    secondary: "border border-transparent bg-lavender-50 text-lavender-900",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
