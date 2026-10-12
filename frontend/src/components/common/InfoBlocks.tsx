import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-[20px] border border-lavender-200/80 bg-lavender-50/80 p-4 shadow-soft dark:border-white/10 dark:bg-white/5", className)}>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted/80 dark:text-white/45">{label}</p>
      <p className="mt-1 text-xl font-black text-ink dark:text-white">{value}</p>
    </div>
  );
}

export function IconNote({ icon: Icon, title, text, className }: { icon: LucideIcon; title: string; text: string; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-[20px] border border-lavender-200/80 bg-lavender-50/80 p-4 dark:border-white/10 dark:bg-white/5", className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-black text-ink dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted dark:text-white/60">{text}</p>
      </div>
    </div>
  );
}
