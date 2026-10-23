import { AlertCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/context/useLanguage";

export function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-28 animate-pulse rounded-[28px] bg-lavender-100/70 shadow-card" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-card bg-lavender-100/70 shadow-card" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-card bg-lavender-100/70 shadow-card" />
    </div>
  );
}

export function EmptyState({ title, text }: { title?: string; text?: string }) {
  const { t } = useLanguage();
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center text-center">
      <Sparkles className="mb-3 h-8 w-8 text-primary" />
      <h3 className="font-semibold text-ink">{title ?? t.dashboard.noInsights}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{text ?? t.dashboard.noInsightsDesc}</p>
    </Card>
  );
}

export function ErrorState({ title, text }: { title?: string; text?: string }) {
  const { t } = useLanguage();
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-rose-500" />
      <h3 className="font-semibold text-ink">{title ?? t.common.error}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{text ?? t.common.tryAgain}</p>
    </Card>
  );
}
