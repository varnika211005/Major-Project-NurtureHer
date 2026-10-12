import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Modal({
  trigger,
  title,
  description,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/80 bg-white p-6 shadow-glow outline-none dark:border-white/10 dark:bg-[#241827]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-xl font-black text-ink dark:text-white">{title}</DialogPrimitive.Title>
              {description ? <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted dark:text-white/60">{description}</DialogPrimitive.Description> : null}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" className="h-10 w-10 shrink-0 px-0" aria-label="Close dialog">
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <div className="mt-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
