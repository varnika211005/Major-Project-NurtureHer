import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sheet({ trigger, title, children }: { trigger: ReactNode; title: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] border-l border-white/80 bg-white p-6 shadow-glow outline-none dark:border-white/10 dark:bg-[#241827]">
          <div className="flex items-center justify-between">
            <DialogPrimitive.Title className="text-xl font-black text-ink dark:text-white">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" className="h-10 w-10 px-0" aria-label="Close panel">
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
