import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Card, MotionCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-black tracking-tight text-ink dark:text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-muted dark:text-white/60">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  suffix,
  icon: Icon,
  progress,
  note,
  tone = "from-primary to-accent",
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  progress?: number;
  note?: string;
  tone?: string;
}) {
  return (
    <MotionCard className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-secondary/50 to-accent/60" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-muted dark:text-white/60">{label}</p>
          <div className="mt-3 flex items-end gap-1">
            <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-black text-ink dark:text-white">{value}</motion.span>
            {suffix ? <span className="pb-1 text-sm font-black text-muted">{suffix}</span> : null}
          </div>
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br text-white shadow-glow", tone)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      {progress !== undefined ? <Progress value={progress} className="mt-5" /> : null}
      {note ? <p className="mt-3 text-xs font-semibold text-muted dark:text-white/50">{note}</p> : null}
    </MotionCard>
  );
}

export function MiniMetric({
  label,
  value,
  icon: Icon,
  children,
  tone = "from-primary to-accent",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  children?: ReactNode;
  tone?: string;
}) {
  return (
    <MotionCard className="relative min-h-44 overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-muted/80 dark:text-white/45">{label}</p>
          <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-glow", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 h-16">{children}</div>
    </MotionCard>
  );
}

export function Gauge({ value, label }: { value: number; label: string }) {
  const degrees = Math.min(180, Math.max(0, value * 1.8));
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="relative h-32 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-64 rounded-full bg-gradient-to-r from-teal via-amber to-danger p-4">
          <div className="h-full rounded-full bg-white dark:bg-[#241627]" />
        </div>
        <div className="absolute bottom-0 left-1/2 h-1 w-[42%] origin-left rounded-full bg-ink shadow-card transition dark:bg-white" style={{ transform: `rotate(${degrees}deg)` }} />
        <div className="absolute bottom-0 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-primary shadow-glow" />
      </div>
      <p className="mt-2 text-center text-3xl font-black text-ink dark:text-white">{value}%</p>
      <p className="text-center text-sm font-bold text-muted dark:text-white/55">{label}</p>
    </div>
  );
}

export function ProgressRow({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div className="rounded-[18px] bg-lavender-50/90 border border-lavender-200/50 p-4 dark:bg-white/5 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-ink dark:text-white">{label}</p>
        <p className="text-sm font-black text-primary">{value}%</p>
      </div>
      <Progress value={value} />
      {detail ? <p className="mt-2 text-xs font-semibold text-muted dark:text-white/50">{detail}</p> : null}
    </div>
  );
}

export function Timeline({ items }: { items: { id?: string; title: string; detail: string; time: string }[] }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id ?? `${item.title}-${item.time}-${index}`} className="grid grid-cols-[28px_1fr] gap-3">
          <div className="flex flex-col items-center">
            <span className="h-3 w-3 rounded-full bg-gradient-to-br from-primary to-accent shadow-glow" />
            {index < items.length - 1 ? <span className="mt-2 h-full min-h-10 w-px bg-lavender-200 dark:bg-white/10" /> : null}
          </div>
          <div className="rounded-[18px] bg-lavender-50/90 border border-lavender-200/60 p-4 dark:bg-white/5 dark:border-white/10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/80">{item.time}</p>
            <h3 className="mt-1 font-black text-ink dark:text-white">{item.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted dark:text-white/60">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  rows,
  columns,
  title = "History",
  subtitle = "Recent records and follow-up status",
}: {
  rows: Record<string, string | number>[];
  columns: string[];
  title?: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-muted dark:text-white/50 border-b border-lavender-200/70 dark:border-white/10">
            <tr>{columns.map((column) => <th key={column} className="pb-3 font-black capitalize">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-lavender-100 dark:divide-white/5">
            {rows.map((row, index) => (
              <tr key={index} className="transition hover:bg-lavender-50/80 dark:hover:bg-white/5">
                {columns.map((column) => (
                  <td key={column} className="py-4 font-semibold text-ink dark:text-white">{row[column]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
