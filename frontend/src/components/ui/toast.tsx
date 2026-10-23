import { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toast({ title, description, className }: { title: string; description?: ReactNode; className?: string }) {
  return (
    <div className={cn("gradient-border flex items-start gap-3 rounded-[22px] bg-surface/90 p-4 shadow-card backdrop-blur-xl", className)}>
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      </div>
    </div>
  );
}
