import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

export function Tooltip({ children, content }: { children: ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={180}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={8}
            className="z-50 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white shadow-card dark:bg-white dark:text-ink"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-ink dark:fill-white" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
