import { forwardRef, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: ReactNode; hint?: ReactNode };

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField({
  label,
  error,
  hint,
  className,
  ...props
}, ref) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <label htmlFor={id} className={cn("block text-sm font-bold text-muted dark:text-white/60", className)}>
      {label}
      <Input ref={ref} id={id} aria-invalid={Boolean(error)} aria-describedby={error || hint ? descriptionId : undefined} className="mt-2" {...props} />
      {error ? <span id={descriptionId} className="mt-1 block text-xs font-bold text-danger">{error}</span> : null}
      {!error && hint ? <span id={descriptionId} className="mt-1 block text-xs font-semibold text-muted/80 dark:text-white/45">{hint}</span> : null}
    </label>
  );
});

export function TextAreaField({
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="block text-sm font-bold text-muted dark:text-white/60">
      {label}
      <textarea
        id={id}
        className={cn(
          "mt-2 min-h-48 w-full resize-y rounded-[24px] border border-lavender-200 bg-white/90 p-4 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-white/10 dark:bg-white/10 dark:text-white",
          className,
        )}
        {...props}
      />
    </label>
  );
}
