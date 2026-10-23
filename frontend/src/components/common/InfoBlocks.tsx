import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-[20px] border border-lavender-200/80 bg-lavender-50/80 p-4 shadow-soft", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted/80">{label}</p>
      <p className="mt-1 text-xl font-black text-ink">{value}</p>
    </div>
  );
}

export function IconNote({ icon: Icon, title, text, className }: { icon: LucideIcon; title: string; text: string; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-[20px] border border-lavender-200/80 bg-lavender-50/80 p-4", className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
      </div>
    </div>
  );
}
