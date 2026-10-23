import { forwardRef, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: ReactNode;
  hint?: ReactNode;
  trailingAction?: ReactNode;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField({
  label,
  error,
  hint,
  trailingAction,
  className,
  ...props
}, ref) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <label htmlFor={id} className={cn("block text-sm font-bold text-muted", className)}>
      {label}
      <div className="relative mt-2">
        <Input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? descriptionId : undefined}
          className={cn(trailingAction && "pr-11")}
          {...props}
        />
        {trailingAction ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {trailingAction}
          </div>
        ) : null}
      </div>
      {error ? <span id={descriptionId} className="mt-1 block text-xs font-bold text-danger">{error}</span> : null}
      {!error && hint ? <span id={descriptionId} className="mt-1 block text-xs font-semibold text-muted/80">{hint}</span> : null}
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
    <label htmlFor={id} className="block text-sm font-bold text-muted">
      {label}
      <textarea
        id={id}
        className={cn(
          "mt-2 min-h-48 w-full resize-y rounded-[24px] border border-lavender-200 bg-surface/90 p-4 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15",
          className,
        )}
        {...props}
      />
    </label>
  );
}
