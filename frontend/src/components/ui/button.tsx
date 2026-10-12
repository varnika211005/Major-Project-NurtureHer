import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-gradient-to-r from-primary to-accent text-white shadow-glow hover:-translate-y-0.5",
      secondary: "bg-white text-ink shadow-card hover:-translate-y-0.5 dark:bg-white/10 dark:text-white",
      ghost: "bg-transparent text-muted hover:bg-white/70 dark:text-white/70 dark:hover:bg-white/10",
      danger: "bg-rose-600 text-white shadow-card hover:-translate-y-0.5",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs rounded-xl",
      md: "h-11 px-4 text-sm rounded-2xl",
      lg: "h-13 px-6 text-base rounded-2xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-bold outline-none transition duration-200 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
