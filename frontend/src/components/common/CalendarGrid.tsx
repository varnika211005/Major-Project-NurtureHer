import { cn } from "@/lib/utils";

export function CalendarGrid({
  days = 35,
  monthDays = 31,
  activeFrom,
  activeTo,
  compact = false,
}: {
  days?: number;
  monthDays?: number;
  activeFrom: number;
  activeTo: number;
  compact?: boolean;
}) {
  return (
    <div className="grid grid-cols-7 gap-2 md:gap-3">
      {Array.from({ length: days }, (_, index) => {
        const day = index + 1;
        const active = day >= activeFrom && day <= activeTo && day <= monthDays;
        return (
          <div
            key={day}
            className={cn(
              "flex aspect-square items-center justify-center rounded-[18px] font-black transition",
              compact ? "text-sm" : "text-sm md:text-base",
              active
                ? "bg-gradient-to-br from-primary to-accent text-white shadow-glow"
                : "bg-pink-50/80 text-muted hover:bg-white hover:shadow-soft dark:bg-white/10 dark:hover:bg-white/15",
            )}
          >
            {day <= monthDays ? day : ""}
          </div>
        );
      })}
    </div>
  );
}
